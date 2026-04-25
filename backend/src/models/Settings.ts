import mongoose, { Schema, type Document } from "mongoose";

export interface ICategoryConfig {
  id: string;
  label: string;
}

export interface ISizeGroupConfig {
  label: string;
  sizes: string[];
}

export interface ISettings extends Document {
  categories: ICategoryConfig[];
  size_groups: ISizeGroupConfig[];
}

const categorySchema = new Schema<ICategoryConfig>({
  id: { type: String, required: true },
  label: { type: String, required: true },
});

const sizeGroupSchema = new Schema<ISizeGroupConfig>({
  label: { type: String, required: true },
  sizes: [{ type: String }],
});

const settingsSchema = new Schema<ISettings>(
  {
    categories: { type: [categorySchema], default: [] },
    size_groups: { type: [sizeGroupSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema);
