import { Notification, type INotification, type NotificationType } from "../models/Notification.js";
import { recordMetric, structuredLog } from "./observability.js";

export interface NotificationInput {
  userId: string;
  email?: string;
  type: NotificationType;
  title: string;
  message: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

interface ResendResponse {
  id?: string;
  message?: string;
}

interface NotificationDocumentInput {
  user_id: string;
  type: NotificationType;
  channel: "in_app" | "email";
  title: string;
  message: string;
  delivery_status: "pending" | "sent" | "failed" | "skipped";
  idempotency_key: string;
  metadata?: Record<string, string>;
  error_code?: string;
  delivered_at?: Date;
}

function providerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 100);
  return "NOTIFICATION_DELIVERY_FAILED";
}

async function upsertNotification(input: NotificationDocumentInput): Promise<INotification> {
  try {
    const notification = await Notification.findOneAndUpdate(
      { idempotency_key: input.idempotency_key },
      { $setOnInsert: input },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!notification) throw new Error("NOTIFICATION_NOT_CREATED");
    return notification;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("duplicate key")) {
      const existing = await Notification.findOne({ idempotency_key: input.idempotency_key });
      if (existing) return existing;
    }
    throw error;
  }
}

async function sendEmail(input: NotificationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
        subject: input.title,
        text: input.message,
      }),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as ResendResponse | null;
    if (!response.ok) {
      throw new Error(typeof payload?.message === "string" ? "RESEND_REQUEST_REJECTED" : `RESEND_HTTP_${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function persistEmailDelivery(input: NotificationInput): Promise<INotification> {
  if (!input.email) {
    return upsertNotification({
      user_id: input.userId,
      type: input.type,
      channel: "email",
      title: input.title,
      message: input.message,
      delivery_status: "skipped",
      error_code: "NOTIFICATION_RECIPIENT_MISSING",
      idempotency_key: `${input.idempotencyKey}:email`,
      metadata: input.metadata,
    });
  }

  const delivery = await upsertNotification({
    user_id: input.userId,
    type: input.type,
    channel: "email",
    title: input.title,
    message: input.message,
    delivery_status: providerConfigured() ? "pending" : "skipped",
    ...(providerConfigured() ? {} : { error_code: "EMAIL_PROVIDER_NOT_CONFIGURED" }),
    idempotency_key: `${input.idempotencyKey}:email`,
    metadata: input.metadata,
  });

  if (delivery.delivery_status === "sent" || delivery.delivery_status === "skipped") return delivery;

  try {
    await sendEmail(input);
    delivery.delivery_status = "sent";
    delivery.delivered_at = new Date();
    delivery.error_code = undefined;
    await delivery.save();
    recordMetric("notifications_email_sent_total");
  } catch (error: unknown) {
    delivery.delivery_status = "failed";
    delivery.error_code = safeErrorCode(error);
    await delivery.save();
    recordMetric("notifications_email_failed_total");
    structuredLog("error", "notification.email_delivery_failed", {
      notificationId: delivery._id.toString(),
      type: input.type,
      errorCode: delivery.error_code,
    });
  }
  return delivery;
}

export async function dispatchNotification(input: NotificationInput): Promise<{ inApp: INotification; email: INotification }> {
  const inApp = await upsertNotification({
    user_id: input.userId,
    type: input.type,
    channel: "in_app",
    title: input.title,
    message: input.message,
    delivery_status: "sent",
    delivered_at: new Date(),
    idempotency_key: `${input.idempotencyKey}:in_app`,
    metadata: input.metadata,
  });
  const email = await persistEmailDelivery(input);
  recordMetric("notifications_in_app_created_total");
  return { inApp, email };
}

export async function listUserNotifications(params: {
  userId: string;
  page: number;
  limit: number;
  skip: number;
}): Promise<{ data: INotification[]; total: number; unreadCount: number }> {
  const filter = { user_id: params.userId, channel: "in_app" as const };
  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(params.skip).limit(params.limit).lean<INotification[]>(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read_at: { $exists: false } }),
  ]);
  return { data, total, unreadCount };
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<INotification | null> {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user_id: userId, channel: "in_app" },
    { $set: { read_at: new Date() } },
    { new: true },
  );
}
