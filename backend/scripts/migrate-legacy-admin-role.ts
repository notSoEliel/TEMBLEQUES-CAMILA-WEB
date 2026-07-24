import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { AdminAuditLog } from "../src/models/AdminAuditLog.js";
import { User } from "../src/models/User.js";

const applyMigration = process.argv.includes("--apply");
const isProduction = process.env.APP_ENV === "production";
const productionOverride = process.env.LEGACY_ROLE_MIGRATION_ALLOW_PRODUCTION === "true";

if (isProduction && !productionOverride) {
  throw new Error(
    "La migración de roles legacy está bloqueada en producción. Requiere LEGACY_ROLE_MIGRATION_ALLOW_PRODUCTION=true.",
  );
}

await connectDB();

try {
  const legacyUserFilter = { role: "admin" };
  const legacyAuditFilter = { actorRole: "admin" };
  const [legacyUsers, legacyAuditLogs] = await Promise.all([
    User.countDocuments(legacyUserFilter),
    AdminAuditLog.countDocuments(legacyAuditFilter),
  ]);

  console.log(`[LegacyRoleMigration] Usuarios pendientes: ${legacyUsers}.`);
  console.log(`[LegacyRoleMigration] Auditorías pendientes: ${legacyAuditLogs}.`);

  if (!applyMigration) {
    console.log("[LegacyRoleMigration] Solo diagnóstico. Usa --apply para ejecutar la conversión.");
  } else {
    const [userResult, auditResult] = await Promise.all([
      User.updateMany(legacyUserFilter, { $set: { role: "owner" } }),
      AdminAuditLog.updateMany(legacyAuditFilter, { $set: { actorRole: "owner" } }),
    ]);

    console.log(`[LegacyRoleMigration] Usuarios convertidos: ${userResult.modifiedCount}.`);
    console.log(`[LegacyRoleMigration] Auditorías convertidas: ${auditResult.modifiedCount}.`);
  }
} finally {
  await mongoose.disconnect();
}
