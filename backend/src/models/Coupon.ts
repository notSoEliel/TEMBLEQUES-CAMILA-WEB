import mongoose, { Schema, type Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  discount_type: "percentage" | "fixed";
  value: number;
  is_active: boolean;
  expires_at?: Date;
  max_uses?: number;
  used_count: number;
  min_purchase_amount?: number;
  applicable_categories?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discount_type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    is_active: { type: Boolean, default: true },
    expires_at: { type: Date },
    max_uses: { type: Number, min: 1 },
    used_count: { type: Number, default: 0, min: 0 },
    min_purchase_amount: { type: Number, min: 0 },
    applicable_categories: [{ type: String }],
  },
  { timestamps: true }
);

export const Coupon = mongoose.model<ICoupon>("Coupon", couponSchema);
