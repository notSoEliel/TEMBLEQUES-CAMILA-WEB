import mongoose, { Schema, type Document, type Types } from "mongoose";

export type PaymentRefundStatus = "pending" | "succeeded" | "failed";

export interface IPaymentRefund extends Document {
  rental_id: Types.ObjectId;
  requested_by: Types.ObjectId;
  stripe_payment_intent_id: string;
  stripe_refund_id?: string;
  amount: number;
  reason: string;
  status: PaymentRefundStatus;
  idempotency_key: string;
  request_id?: string;
  error_code?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRefundSchema = new Schema<IPaymentRefund>(
  {
    rental_id: { type: Schema.Types.ObjectId, ref: "Rental", required: true, index: true },
    requested_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    stripe_payment_intent_id: { type: String, required: true, trim: true },
    stripe_refund_id: { type: String, unique: true, sparse: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["pending", "succeeded", "failed"], required: true, default: "pending" },
    idempotency_key: { type: String, required: true, unique: true, trim: true },
    request_id: { type: String, trim: true },
    error_code: { type: String, trim: true },
  },
  { timestamps: true },
);

paymentRefundSchema.index({ rental_id: 1, status: 1, createdAt: -1 });

export const PaymentRefund = mongoose.model<IPaymentRefund>("PaymentRefund", paymentRefundSchema);
