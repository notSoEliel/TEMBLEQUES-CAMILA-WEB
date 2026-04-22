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

export interface IRental extends Document {
  user_id: Types.ObjectId;
  product_id: Types.ObjectId;
  start_date: Date;
  end_date: Date;
  total: number;
  status: RentalStatus;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  terms_accepted: boolean;
  stripe_session_id?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rentalSchema = new Schema<IRental>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
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
  },
  { timestamps: true }
);

rentalSchema.index({ product_id: 1, start_date: 1, end_date: 1 });
rentalSchema.index({ user_id: 1 });
rentalSchema.index({ status: 1 });

export const Rental = mongoose.model<IRental>("Rental", rentalSchema);
