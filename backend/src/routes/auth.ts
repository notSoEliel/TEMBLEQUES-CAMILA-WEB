import { Hono } from "hono";
import { Webhook } from "svix";
import { z } from "zod";
import { User } from "../models/User.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { roleFromMetadata } from "../security/permissions.js";

const auth = new Hono<{ Variables: AuthVariables }>();

import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// GET /api/auth/me — returns the MongoDB profile of the authenticated user
auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");

  // En entorno local los webhooks pueden fallar. Sincronizamos el rol de Clerk al cargar la sesión.
  if (!user.clerkId.startsWith("mock_")) {
    try {
      const clerkUser = await clerkClient.users.getUser(user.clerkId);
      const role = roleFromMetadata(clerkUser.publicMetadata);
      
      if (user.role !== role) {
        user.role = role;
        await user.save();
      }
    } catch (err) {
      console.error("[Auth] Error sync role from Clerk on /me:", err);
    }
  }

  return c.json({
    user: {
      id: user._id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferredAddress: user.preferredAddress,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    },
  });
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120, "El nombre es demasiado largo").optional(),
  phone: z.string().trim().max(40, "El teléfono es demasiado largo").optional().or(z.literal("")),
  preferredAddress: z.string().trim().max(240, "La dirección es demasiado larga").optional().or(z.literal("")),
  preferredLanguage: z.enum(["es", "en"]).optional(),
});

// PATCH /api/auth/me — updates local customer profile fields stored in MongoDB.
auth.patch("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const data = updateProfileSchema.parse(body);

  if (data.name !== undefined) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone || undefined;
  if (data.preferredAddress !== undefined) user.preferredAddress = data.preferredAddress || undefined;
  if (data.preferredLanguage !== undefined) user.preferredLanguage = data.preferredLanguage;
  await user.save();

  return c.json({
    user: {
      id: user._id,
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferredAddress: user.preferredAddress,
      preferredLanguage: user.preferredLanguage,
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
    const isDemoEnvironment = process.env.AUTH_MOCKS_ENABLED === "true"
      || process.env.INTEGRATIONS_MODE === "demo";
    const isExposedEnvironment = process.env.APP_ENV === "staging"
      || process.env.APP_ENV === "production";

    if (isExposedEnvironment || !isDemoEnvironment) {
      throw new AppError(
        "El webhook de Clerk no está configurado en este entorno.",
        503,
        "CLERK_WEBHOOK_NOT_CONFIGURED",
      );
    }

    return c.json({ received: true, mode: "demo" });
  }

  // Collect raw body and Svix headers for signature verification
  const body = await c.req.text();
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError("Headers de webhook inválidos", 400, "VALIDATION_ERROR");
  }

  let event: unknown;
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

  const eventSchema = z.object({
    type: z.string(),
    data: z.object({
      id: z.string(),
      email_addresses: z.array(z.object({
        id: z.string(),
        email_address: z.string(),
      })).optional(),
      primary_email_address_id: z.string().nullable().optional(),
      first_name: z.string().nullable().optional(),
      last_name: z.string().nullable().optional(),
      public_metadata: z.record(z.unknown()).optional(),
    }),
  });
  const parsedEvent = eventSchema.parse(event);
  const { type, data } = parsedEvent;
  console.log(`[Webhook] Clerk event: ${type}`);

  if (type === "user.created" || type === "user.updated") {
    const clerkId: string = data.id;
    const primaryEmail: string =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ?? "";
    const name =
      `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || primaryEmail;
    const role = roleFromMetadata(data.public_metadata);

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
