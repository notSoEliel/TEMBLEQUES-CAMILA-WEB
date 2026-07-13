import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { encryptBackup, exportDatabase } from "../src/services/backup.js";
import { structuredLog } from "../src/services/observability.js";

const outputDirectory = resolve(process.env.BACKUP_OUTPUT_DIR ?? "./backups");
const key = process.env.BACKUP_ENCRYPTION_KEY;

if (process.env.APP_ENV === "production" && process.env.BACKUP_ALLOW_PRODUCTION !== "true") {
  throw new Error("El backup de producción requiere BACKUP_ALLOW_PRODUCTION=true.");
}

await connectDB();
await mkdir(outputDirectory, { recursive: true });
const backup = encryptBackup(await exportDatabase(), key);
const filename = `tembleques-${new Date().toISOString().replaceAll(":", "-")}.json.enc`;
await Bun.write(resolve(outputDirectory, filename), JSON.stringify(backup));
structuredLog("info", "backup.created", { filename, directory: outputDirectory });
await mongoose.disconnect();
