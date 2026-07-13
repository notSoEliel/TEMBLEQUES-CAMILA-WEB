import mongoose, { Schema, type Document } from "mongoose";

export interface IStripeWebhookEvent extends Document {
  event_id: string;
  event_type: string;
  processed_at: Date;
}

const stripeWebhookEventSchema = new Schema<IStripeWebhookEvent>({
  event_id: { type: String, required: true, unique: true, trim: true },
  event_type: { type: String, required: true, trim: true },
  processed_at: { type: Date, required: true, default: Date.now },
});

export const StripeWebhookEvent = mongoose.model<IStripeWebhookEvent>(
  "StripeWebhookEvent",
  stripeWebhookEventSchema,
);
