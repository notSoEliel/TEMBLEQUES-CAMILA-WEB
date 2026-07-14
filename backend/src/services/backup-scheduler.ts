import { structuredLog } from "./observability.js";
import { writeEncryptedBackup } from "./backup.js";

const BACKUP_HOUR_UTC = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getNextBackupDelayMs(now = new Date(), targetHourUtc = BACKUP_HOUR_UTC): number {
  const next = new Date(now);
  next.setUTCHours(targetHourUtc, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY_MS);
  return next.getTime() - now.getTime();
}

function isEnabled(): boolean {
  return process.env.BACKUP_ENABLED === "true"
    && (process.env.APP_ENV === "staging" || process.env.APP_ENV === "production");
}

function retentionDays(): number {
  const value = Number(process.env.BACKUP_RETENTION_DAYS ?? "30");
  return Number.isInteger(value) && value > 0 ? value : 30;
}

export function startBackupScheduler(): void {
  if (!isEnabled()) {
    structuredLog("info", "backup.scheduler_disabled", { reason: "BACKUP_ENABLED=false_or_unsupported_environment" });
    return;
  }

  const outputDirectory = process.env.BACKUP_OUTPUT_DIR ?? "/data/backups";
  const runBackup = async (): Promise<void> => {
    try {
      const result = await writeEncryptedBackup({
        outputDirectory,
        encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
        retentionDays: retentionDays(),
      });
      structuredLog("info", "backup.created", {
        filename: result.filename,
        deletedFiles: result.deletedFiles,
        retentionDays: retentionDays(),
      });
    } catch (error: unknown) {
      structuredLog("error", "backup.failed", {
        errorCode: error instanceof Error ? error.name : "BACKUP_FAILED",
      });
    }
  };

  const scheduleNext = (): void => {
    const delay = getNextBackupDelayMs();
    setTimeout(() => {
      void runBackup().finally(scheduleNext);
    }, delay);
  };

  structuredLog("info", "backup.scheduler_started", {
    schedule: "03:00 UTC",
    outputDirectory,
    retentionDays: retentionDays(),
  });

  if (process.env.BACKUP_RUN_ON_START === "true") void runBackup();
  scheduleNext();
}
