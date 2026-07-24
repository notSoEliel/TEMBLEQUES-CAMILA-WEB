import mongoose, { Schema, type Document, type Types } from "mongoose";

export type IncidentType = "damage" | "late_return" | "payment_issue" | "customer_complaint" | "maintenance" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "in_review" | "resolved" | "closed";

export interface IIncidentTimelineEntry {
  status: IncidentStatus;
  note?: string;
  actor_id: Types.ObjectId;
  timestamp: Date;
}

export interface IIncident extends Document {
  rental_id?: Types.ObjectId;
  user_id?: Types.ObjectId;
  product_id?: Types.ObjectId;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  resolution?: string;
  attachments: Array<{ label: string; url: string }>;
  timeline: IIncidentTimelineEntry[];
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    rental_id: { type: Schema.Types.ObjectId, ref: "Rental" },
    user_id: { type: Schema.Types.ObjectId, ref: "User" },
    product_id: { type: Schema.Types.ObjectId, ref: "Product" },
    type: { type: String, enum: ["damage", "late_return", "payment_issue", "customer_complaint", "maintenance", "other"], required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true, default: "medium" },
    status: { type: String, enum: ["open", "in_review", "resolved", "closed"], required: true, default: "open" },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    resolution: { type: String, trim: true, maxlength: 3000 },
    attachments: [{ label: { type: String, required: true, trim: true, maxlength: 160 }, url: { type: String, required: true, trim: true, maxlength: 1000 } }],
    timeline: [{ status: { type: String, required: true }, note: { type: String, trim: true, maxlength: 1000 }, actor_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, timestamp: { type: Date, required: true, default: Date.now } }],
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

incidentSchema.index({ status: 1, severity: 1, createdAt: -1 });
incidentSchema.index({ rental_id: 1 });
incidentSchema.index({ user_id: 1 });

export const Incident = mongoose.model<IIncident>("Incident", incidentSchema);
