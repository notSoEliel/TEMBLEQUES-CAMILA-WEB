import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { EJSON } from "bson";
import mongoose from "mongoose";
import { AppError } from "../lib/errors.js";

const ALGORITHM = "aes-256-gcm";
const VERSION = 1;

export interface EncryptedBackup {
  version: number;
  createdAt: string;
  iv: string;
  authTag: string;
  payload: string;
}

function encryptionKey(key: string | undefined): Buffer {
  if (!key) throw new AppError("BACKUP_ENCRYPTION_KEY no configurada.", 503, "BACKUP_KEY_NOT_CONFIGURED");
  const value = Buffer.from(key, "hex");
  if (value.length !== 32) {
    throw new AppError("BACKUP_ENCRYPTION_KEY debe ser una clave hexadecimal de 32 bytes.", 503, "BACKUP_KEY_INVALID");
  }
  return value;
}

export function encryptBackup(data: unknown, key: string | undefined): EncryptedBackup {
  const ivBuffer = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(key), ivBuffer);
  const iv = ivBuffer.toString("hex");
  const payload = Buffer.concat([cipher.update(EJSON.stringify(data), "utf8"), cipher.final()]);
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    iv,
    authTag: cipher.getAuthTag().toString("hex"),
    payload: payload.toString("base64"),
  };
}

export function decryptBackup(backup: EncryptedBackup, key: string | undefined): unknown {
  if (backup.version !== VERSION) {
    throw new AppError("Versión de backup no compatible.", 400, "BACKUP_VERSION_UNSUPPORTED");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(key), Buffer.from(backup.iv, "hex"));
  decipher.setAuthTag(Buffer.from(backup.authTag, "hex"));
  const payload = Buffer.concat([
    decipher.update(Buffer.from(backup.payload, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return EJSON.parse(payload);
}

export async function exportDatabase(): Promise<Record<string, unknown>> {
  const database = mongoose.connection.db;
  if (!database) throw new AppError("La base de datos no está disponible.", 503, "DATABASE_NOT_READY");
  const collections = await database.listCollections().toArray();
  const data: Record<string, unknown> = {};
  for (const collection of collections) {
    data[collection.name] = await database.collection(collection.name).find({}).toArray();
  }
  return { database: database.databaseName, collections: data };
}

export interface BackupFileResult {
  filename: string;
  path: string;
  deletedFiles: number;
}

export async function writeEncryptedBackup(options: {
  outputDirectory: string;
  encryptionKey: string | undefined;
  now?: Date;
  retentionDays?: number;
}): Promise<BackupFileResult> {
  const now = options.now ?? new Date();
  const outputDirectory = resolve(options.outputDirectory);
  const retentionDays = options.retentionDays ?? 30;
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new AppError("BACKUP_RETENTION_DAYS debe ser un entero positivo.", 503, "BACKUP_RETENTION_INVALID");
  }

  await mkdir(outputDirectory, { recursive: true });
  const backup = encryptBackup(await exportDatabase(), options.encryptionKey);
  const filename = `tembleques-${now.toISOString().replaceAll(":", "-")}.json.enc`;
  const path = join(outputDirectory, filename);
  await writeFile(path, JSON.stringify(backup), { encoding: "utf8", mode: 0o600 });

  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await readdir(outputDirectory, { withFileTypes: true });
  let deletedFiles = 0;
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".json.enc") || file.name === filename) continue;
    const filePath = join(outputDirectory, file.name);
    const metadata = await stat(filePath);
    if (metadata.mtimeMs < cutoff) {
      await unlink(filePath);
      deletedFiles += 1;
    }
  }

  return { filename, path, deletedFiles };
}
