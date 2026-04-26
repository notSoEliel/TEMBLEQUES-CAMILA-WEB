import mongoose, { Schema, type Document } from "mongoose";

export type ProductCategory =
  | "pollera"
  | "vestuario_masculino"
  | "infantil"
  | "tembleques"
  | "accesorios"
  | "paquete_completo";

export type ConditionStatus = "disponible" | "mantenimiento" | "alquilado";

export interface IProduct extends Document {
  name: string;
  category: ProductCategory;
  description: string;
  rental_price: number;
  stock: number;
  condition_status: ConditionStatus;
  size?: string;
  images: string[];
  variants?: Array<{
    size: string;
    stock: number;
    price_override?: number;
  }>;
  deposit_settings?: {
    required: boolean;
    overrideAmount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["pollera", "vestuario_masculino", "infantil", "tembleques", "accesorios", "paquete_completo"],
    },
    description: { type: String, required: true },
    rental_price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 1 },
    condition_status: {
      type: String,
      enum: ["disponible", "mantenimiento", "alquilado"],
      default: "disponible",
    },
    size: { type: String, trim: true },
    images: [{ type: String }],
    variants: [
      {
        size: { type: String, required: true },
        stock: { type: Number, required: true, min: 0 },
        price_override: { type: Number },
      },
    ],
    deposit_settings: {
      required: { type: Boolean, default: false },
      overrideAmount: { type: Number },
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ condition_status: 1 });

export const Product = mongoose.model<IProduct>("Product", productSchema);
