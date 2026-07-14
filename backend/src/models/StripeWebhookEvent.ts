import mongoose, { Schema, type Document } from "mongoose";

export interface IStripeWebhookEvent extends Document {
  event_id: string;
  event_type: string;
  stripe_object_id?: string;
  status: "processing" | "processed" | "failed";
  attempts: number;
  request_id?: string;
  processed_at?: Date;
  last_error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stripeWebhookEventSchema = new Schema<IStripeWebhookEvent>(
  {
    event_id: { type: String, required: true, unique: true, trim: true },
    event_type: { type: String, required: true, trim: true },
    stripe_object_id: { type: String, trim: true, index: true },
    status: { type: String, enum: ["processing", "processed", "failed"], required: true, default: "processing" },
    attempts: { type: Number, required: true, default: 1, min: 1 },
    request_id: { type: String, trim: true },
    processed_at: { type: Date },
    last_error: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const StripeWebhookEvent = mongoose.model<IStripeWebhookEvent>(
  "StripeWebhookEvent",
  stripeWebhookEventSchema,
);
