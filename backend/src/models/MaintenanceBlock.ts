import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IMaintenanceBlock extends Document {
  product_id: Types.ObjectId;
  selected_size: string;
  start_date: Date;
  end_date: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceBlockSchema = new Schema<IMaintenanceBlock>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    selected_size: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

maintenanceBlockSchema.index({ product_id: 1, selected_size: 1, start_date: 1, end_date: 1 });

export const MaintenanceBlock = mongoose.model<IMaintenanceBlock>(
  "MaintenanceBlock",
  maintenanceBlockSchema
);
