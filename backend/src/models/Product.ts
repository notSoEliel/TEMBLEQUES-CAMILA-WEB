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
  category: ProductCategory;
  description: string;
  rental_price: number;
  variants: ISizeVariant[];
  images: string[];
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
    category: {
      type: String,
      required: true,
    },
    description: { type: String, required: true },
    rental_price: { type: Number, required: true, min: 0 },
    variants: { type: [sizeVariantSchema], default: [] },
    images: [{ type: String }],
  },
  { timestamps: true }
);

// Virtual: total stock across all variants
productSchema.virtual("total_stock").get(function (this: IProduct) {
  return this.variants.reduce((sum, v) => sum + v.stock, 0);
});

// Virtual: is available (at least one variant has stock > 0 and is not in maintenance)
productSchema.virtual("is_available").get(function (this: IProduct) {
  return this.variants.some((v) => v.stock > 0 && !v.in_maintenance);
});

// Virtual: price range [min, max]
productSchema.virtual("price_range").get(function (this: IProduct) {
  if (this.variants.length === 0) return { min: this.rental_price, max: this.rental_price };
  const prices = this.variants.map((v) => v.price_override ?? this.rental_price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
});

// Ensure virtuals are included in JSON/Object output
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

productSchema.index({ category: 1 });
productSchema.index({ "variants.size": 1 });
productSchema.index({ "variants.stock": 1 });

export const Product = mongoose.model<IProduct>("Product", productSchema);
