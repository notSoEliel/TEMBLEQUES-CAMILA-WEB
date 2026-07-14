import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { writeEncryptedBackup } from "../src/services/backup.js";
import { structuredLog } from "../src/services/observability.js";

const outputDirectory = process.env.BACKUP_OUTPUT_DIR ?? "./backups";
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "30");

if (process.env.APP_ENV === "production" && process.env.BACKUP_ALLOW_PRODUCTION !== "true") {
  throw new Error("El backup de producción requiere BACKUP_ALLOW_PRODUCTION=true.");
}

await connectDB();
const result = await writeEncryptedBackup({
  outputDirectory,
  encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  retentionDays,
});
structuredLog("info", "backup.created", {
  filename: result.filename,
  directory: outputDirectory,
  deletedFiles: result.deletedFiles,
  retentionDays,
});
await mongoose.disconnect();
