import mongoose, { Schema, type Document } from "mongoose";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "resolved";

export interface ISystemAlert extends Document {
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemAlertSchema = new Schema<ISystemAlert>(
  {
    type: { type: String, required: true, index: true },
    severity: { type: String, enum: ["info", "warning", "critical"], required: true, index: true },
    status: { type: String, enum: ["open", "resolved"], required: true, default: "open", index: true },
    message: { type: String, required: true },
    source: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    resolvedAt: { type: Date },
    resolvedBy: { type: String },
  },
  { timestamps: true },
);

systemAlertSchema.index({ status: 1, createdAt: -1 });

export const SystemAlert = mongoose.model<ISystemAlert>("SystemAlert", systemAlertSchema);
