import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICategoryConfig {
  _id?: Types.ObjectId;
  id: string;
  label: string;
  label_en?: string;
}

export interface ISizeGroupConfig {
  label: string;
  sizes: string[];
}

export interface ISettings extends Document {
  categories: ICategoryConfig[];
  size_groups: ISizeGroupConfig[];
  low_stock_threshold: number;
}

const categorySchema = new Schema<ICategoryConfig>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  label_en: { type: String, trim: true },
});

const sizeGroupSchema = new Schema<ISizeGroupConfig>({
  label: { type: String, required: true },
  sizes: [{ type: String }],
});

const settingsSchema = new Schema<ISettings>(
  {
    categories: { type: [categorySchema], default: [] },
    size_groups: { type: [sizeGroupSchema], default: [] },
    low_stock_threshold: { type: Number, min: 0, max: 1000, default: 1 },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema);
