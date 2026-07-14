import mongoose, { Schema, type Document, type Types } from "mongoose";

export type RentalStatus =
  | "pending"
  | "reserved"
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
export type PaymentStatus = "pending" | "completed" | "failed" | "expired" | "cancelled" | "refunded";

export interface IRental extends Document {
  fixture_key?: string;
  user_id: Types.ObjectId;
  product_id: Types.ObjectId;
  order_group_id: string;
  selected_size: string;
  start_date: Date;
  end_date: Date;
  total: number;
  balance_due: number;
  payment_type: "reservation" | "full";
  status: RentalStatus;
  payment_status: PaymentStatus;
  terms_accepted: boolean;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  stripe_payment_amount?: number;
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
  coupon_code?: string;
  discount_amount?: number;
  status_history: Array<{
    status: RentalStatus;
    timestamp: Date;
    notes?: string;
    updated_by?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const rentalSchema = new Schema<IRental>(
  {
    fixture_key: { type: String, trim: true, unique: true, sparse: true, select: false },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    order_group_id: { type: String, required: false },
    selected_size: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total: { type: Number, required: true, min: 0 },
    balance_due: { type: Number, required: true, default: 0, min: 0 },
    payment_type: { type: String, enum: ["reservation", "full"], required: true, default: "reservation" },
    status: {
      type: String,
      enum: ["pending", "reserved", "paid", "confirmed", "delivered", "returned", "late", "damaged", "cancelled"],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed", "expired", "cancelled", "refunded"],
      default: "pending",
    },
    terms_accepted: { type: Boolean, required: true, default: false },
    stripe_session_id: { type: String },
    stripe_payment_intent_id: { type: String },
    stripe_payment_amount: { type: Number, min: 0 },
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
    coupon_code: { type: String },
    discount_amount: { type: Number, default: 0 },
    status_history: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
        notes: { type: String },
        updated_by: { type: String },
      },
    ],
  },
  { timestamps: true }
);

rentalSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("status")) {
    const statusVal = this.status;
    const alreadyExists = this.status_history.some(h => h.status === statusVal);
    if (!alreadyExists) {
      this.status_history.push({
        status: statusVal,
        timestamp: new Date(),
        notes: `Estado de la reserva actualizado a: ${statusVal}`,
      });
    }
  }
  next();
});

rentalSchema.index({ product_id: 1, start_date: 1, end_date: 1 });
rentalSchema.index({ user_id: 1 });
rentalSchema.index({ status: 1 });

export const Rental = mongoose.model<IRental>("Rental", rentalSchema);
