import mongoose, { Schema, type Document, type Types } from "mongoose";

export type NotificationType =
  | "payment_confirmed"
  | "payment_failed"
  | "payment_expired"
  | "reservation_cancelled"
  | "refund_completed"
  | "incident_created"
  | "incident_updated"
  | "low_stock";

export type NotificationChannel = "in_app" | "email";
export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface INotification extends Document {
  user_id: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  read_at?: Date;
  delivery_status: NotificationDeliveryStatus;
  delivered_at?: Date;
  error_code?: string;
  idempotency_key: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "payment_confirmed",
        "payment_failed",
        "payment_expired",
        "reservation_cancelled",
        "refund_completed",
        "incident_created",
        "incident_updated",
        "low_stock",
      ],
      required: true,
    },
    channel: { type: String, enum: ["in_app", "email"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    read_at: { type: Date },
    delivery_status: { type: String, enum: ["pending", "sent", "failed", "skipped"], required: true },
    delivered_at: { type: Date },
    error_code: { type: String, trim: true, maxlength: 120 },
    idempotency_key: { type: String, required: true, unique: true, trim: true, maxlength: 240 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ user_id: 1, channel: 1, read_at: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
