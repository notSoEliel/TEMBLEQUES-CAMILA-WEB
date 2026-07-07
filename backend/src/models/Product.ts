import mongoose, { Schema, type Document } from "mongoose";

export type ProductCategory = string;

export interface ISizeVariant {
  size: string;
  stock: number;
  price_override?: number;
  in_maintenance: boolean;
}

export interface IProduct extends Document {
  name: string;
  name_en?: string;
  category: ProductCategory[];
  description: string;
  description_en?: string;
  rental_price: number;
  variants: ISizeVariant[];
  images: string[];
  deposit_settings: {
    required: boolean;
    overrideAmount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const sizeVariantSchema = new Schema<ISizeVariant>(
  {
    size: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 1 },
    price_override: { type: Number, min: 0 },
    in_maintenance: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    name_en: { type: String, trim: true },
    category: [{
      type: String,
      required: true,
    }],
    description: { type: String, required: true },
    description_en: { type: String },
    rental_price: { type: Number, required: true, min: 0 },
    variants: { type: [sizeVariantSchema], default: [] },
    images: [{ type: String }],
    deposit_settings: {
      required: { type: Boolean, default: false },
      overrideAmount: { type: Number, min: 0 },
    },
  },
  { timestamps: true }
);

// Virtual: total stock across all variants
productSchema.virtual("total_stock").get(function (this: IProduct) {
  if (!this.variants) return 0;
  return this.variants.reduce((sum, v) => sum + v.stock, 0);
});

// Virtual: is available (at least one variant has stock > 0 and is not in maintenance)
productSchema.virtual("is_available").get(function (this: IProduct) {
  if (!this.variants) return false;
  return this.variants.some((v) => v.stock > 0 && !v.in_maintenance);
});

// Virtual: price range [min, max]
productSchema.virtual("price_range").get(function (this: IProduct) {
  const basePrice = this.rental_price ?? 0;
  if (!this.variants || this.variants.length === 0) return { min: basePrice, max: basePrice };
  const prices = this.variants.map((v) => v.price_override ?? basePrice);
  return { min: Math.min(...prices), max: Math.max(...prices) };
});

// Ensure virtuals are included in JSON/Object output
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

productSchema.index({ category: 1 });
productSchema.index({ "variants.size": 1 });
productSchema.index({ "variants.stock": 1 });

export const Product = mongoose.model<IProduct>("Product", productSchema);
