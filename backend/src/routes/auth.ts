import { Hono } from "hono";
import { Webhook } from "svix";
import { User } from "../models/User.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";

const auth = new Hono<{ Variables: AuthVariables }>();

import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// GET /api/auth/me — returns the MongoDB profile of the authenticated user
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");

  // En entorno local los webhooks pueden fallar. Sincronizamos el rol de Clerk al cargar la sesión.
  try {
    const clerkUser = await clerkClient.users.getUser(user.clerkId);
    const role = (clerkUser.publicMetadata?.role as "client" | "admin") ?? "client";
    
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }
  } catch (err) {
    console.error("[Auth] Error sync role from Clerk on /me:", err);
  }

  return c.json({
    user: {
      id: user._id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /api/auth/webhook
 * Receives Clerk webhook events and syncs them to MongoDB.
 * Verifies the request signature using svix before processing.
 *
 * Configure in Clerk Dashboard → Webhooks:
 *   URL: https://your-domain/api/auth/webhook
 *   Events: user.created, user.updated, user.deleted
 */
auth.post("/webhook", async (c) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET || WEBHOOK_SECRET.startsWith("whsec_placeholder")) {
    console.warn("[Webhook] CLERK_WEBHOOK_SECRET not configured — skipping signature verification");
    return c.json({ received: true });
  }

  // Collect raw body and Svix headers for signature verification
  const body = await c.req.text();
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError("Headers de webhook inválidos", 400, "VALIDATION_ERROR");
  }

  let event: any;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    throw new AppError("Firma de webhook inválida", 400, "VALIDATION_ERROR");
  }

  const { type, data } = event;
  console.log(`[Webhook] Clerk event: ${type}`);

  if (type === "user.created" || type === "user.updated") {
    const clerkId: string = data.id;
    const primaryEmail: string =
      data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)
        ?.email_address ?? "";
    const name =
      `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || primaryEmail;
    const role: "client" | "admin" =
      (data.public_metadata?.role as "client" | "admin") ?? "client";

    await User.findOneAndUpdate(
      { clerkId },
      { clerkId, name, email: primaryEmail, role },
      { upsert: true, new: true },
    );
    console.log(`[Webhook] User upserted in MongoDB: ${clerkId}`);
  }

  if (type === "user.deleted") {
    await User.findOneAndDelete({ clerkId: data.id });
    console.log(`[Webhook] User deleted from MongoDB: ${data.id}`);
  }

  return c.json({ received: true });
});

export default auth;
