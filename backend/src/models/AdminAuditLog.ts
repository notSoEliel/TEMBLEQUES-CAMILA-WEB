import mongoose, { Schema, type Document } from "mongoose";
import type { Role } from "./User.js";

export type AuditSource = "web" | "mcp" | "system";

export interface IAdminAuditLog extends Document {
  actorUserId: mongoose.Types.ObjectId;
  actorClerkId: string;
  actorRole: Role;
  action: string;
  entity: string;
  entityId?: string;
  source: AuditSource;
  method: string;
  path: string;
  requestId: string;
  ipAddress: string;
  userAgent: string;
  statusCode: number;
  success: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorClerkId: { type: String, required: true, trim: true },
    actorRole: { type: String, enum: ["client", "owner", "operator", "inventory", "support", "admin"], required: true },
    action: { type: String, required: true, trim: true, index: true },
    entity: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true },
    source: { type: String, enum: ["web", "mcp", "system"], required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    requestId: { type: String, required: true, unique: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    statusCode: { type: Number, required: true },
    success: { type: Boolean, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AdminAuditLog = mongoose.model<IAdminAuditLog>("AdminAuditLog", adminAuditLogSchema);
