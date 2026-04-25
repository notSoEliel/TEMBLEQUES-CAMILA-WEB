import mongoose, { Schema, type Document, type Types } from "mongoose";

export type RentalStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "delivered"
  | "returned"
  | "late"
  | "damaged"
  | "cancelled";

export type DepositStatus =
  | "not_required"
  | "pending_hold"
  | "held"
  | "released"
  | "captured"
  | "failed";

export type FeeStatus = "not_applicable" | "pending" | "charged" | "failed";

export interface IRental extends Document {
  user_id: Types.ObjectId;
  product_id: Types.ObjectId;
  selected_size: string;
  start_date: Date;
  end_date: Date;
  total: number;
  status: RentalStatus;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  terms_accepted: boolean;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  stripe_deposit_intent_id?: string;
  stripe_late_fee_intent_id?: string;
  stripe_customer_id?: string;
  stripe_payment_method_id?: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: DepositStatus;
  deposit_failure_reason?: string;
  late_days: number;
  late_fee_amount: number;
  late_fee_status: FeeStatus;
  late_fee_failure_reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rentalSchema = new Schema<IRental>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    selected_size: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "confirmed", "delivered", "returned", "late", "damaged", "cancelled"],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    terms_accepted: { type: Boolean, required: true, default: false },
    stripe_session_id: { type: String },
    stripe_payment_intent_id: { type: String },
    stripe_deposit_intent_id: { type: String },
    stripe_late_fee_intent_id: { type: String },
    stripe_customer_id: { type: String },
    stripe_payment_method_id: { type: String },
    deposit_required: { type: Boolean, required: true, default: false },
    deposit_amount: { type: Number, required: true, min: 0, default: 0 },
    deposit_status: {
      type: String,
      enum: ["not_required", "pending_hold", "held", "released", "captured", "failed"],
      default: "not_required",
    },
    deposit_failure_reason: { type: String },
    late_days: { type: Number, required: true, min: 0, default: 0 },
    late_fee_amount: { type: Number, required: true, min: 0, default: 0 },
    late_fee_status: {
      type: String,
      enum: ["not_applicable", "pending", "charged", "failed"],
      default: "not_applicable",
    },
    late_fee_failure_reason: { type: String },
  },
  { timestamps: true }
);

rentalSchema.index({ product_id: 1, start_date: 1, end_date: 1 });
rentalSchema.index({ user_id: 1 });
rentalSchema.index({ status: 1 });

export const Rental = mongoose.model<IRental>("Rental", rentalSchema);
