import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDB } from "../src/db.js";
import { buildIsolatedMongoUri, decryptBackup, type EncryptedBackup } from "../src/services/backup.js";
import { structuredLog } from "../src/services/observability.js";

if (process.env.APP_ENV === "production") {
  throw new Error("La restauración automática está bloqueada contra producción.");
}
if (process.env.RESTORE_CONFIRMATION !== "isolated") {
  throw new Error("La restauración requiere RESTORE_CONFIRMATION=isolated.");
}

if (process.env.RESTORE_DATABASE_NAME) {
  process.env.MONGO_URI = buildIsolatedMongoUri(process.env.MONGO_URI ?? "", process.env.RESTORE_DATABASE_NAME);
}

const inputFile = process.env.BACKUP_FILE;
if (!inputFile) throw new Error("BACKUP_FILE es requerido.");

await connectDB();
const backup = JSON.parse(await readFile(inputFile, "utf8")) as EncryptedBackup;
const restored = decryptBackup(backup, process.env.BACKUP_ENCRYPTION_KEY) as {
  collections: Record<string, Array<Record<string, unknown>>>;
};
const database = mongoose.connection.db;
if (!database) throw new Error("La base de datos no está disponible.");

for (const [name, documents] of Object.entries(restored.collections)) {
  const collection = database.collection(name);
  await collection.deleteMany({});
  if (documents.length > 0) await collection.insertMany(documents);
}

structuredLog("info", "backup.restored", { collections: Object.keys(restored.collections) });
await mongoose.disconnect();
