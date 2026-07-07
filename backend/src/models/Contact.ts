import mongoose, { Schema, type Document } from "mongoose";

export type ContactStatus = "unread" | "read" | "archived";

export interface IContact extends Document {
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["unread", "read", "archived"], default: "unread" },
    ipAddress: { type: String, required: true, trim: true },
    userAgent: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

export const Contact = mongoose.model<IContact>("Contact", contactSchema);
