import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import { Contact } from "../models/Contact.js";
import { Rental } from "../models/Rental.js";
import { TermsAcceptance } from "../models/TermsAcceptance.js";
import { User } from "../models/User.js";
import { structuredLog } from "../services/observability.js";

const privacy = new Hono<{ Variables: AuthVariables }>();
privacy.use("/*", authMiddleware);

privacy.get("/export", async (c) => {
  const user = c.get("user");
  const [profile, rentals, termsAcceptances] = await Promise.all([
    User.findById(user._id).select("clerkId name email phone preferredAddress createdAt updatedAt").lean(),
    Rental.find({ user_id: user._id }).select("product_id selected_size start_date end_date total balance_due payment_type status payment_status terms_accepted createdAt updatedAt").lean(),
    TermsAcceptance.find({ user_id: user._id }).select("rental_id accepted_at ip_address user_agent").lean(),
  ]);

  return c.json({ exportedAt: new Date().toISOString(), profile, rentals, termsAcceptances });
});

privacy.delete("/", async (c) => {
  const user = c.get("user");
  const anonymizedEmail = `deleted-${user._id.toString()}@privacy.invalid`;
  await Promise.all([
    User.findByIdAndUpdate(user._id, {
      name: "Usuario anonimizado",
      email: anonymizedEmail,
      phone: undefined,
      preferredAddress: undefined,
    }),
    Contact.updateMany({ email: user.email }, {
      $set: { name: "Usuario anonimizado", email: anonymizedEmail, message: "Mensaje eliminado por solicitud de privacidad." },
    }),
    TermsAcceptance.updateMany({ user_id: user._id }, {
      $set: { ip_address: "anonimizada", user_agent: "anonimizado" },
    }),
  ]);

  structuredLog("info", "privacy.account_anonymized", { userId: user._id.toString() });
  return c.json({ message: "La información personal fue anonimizada. Los registros necesarios para obligaciones contables se conservaron sin datos identificables." });
});

export default privacy;
