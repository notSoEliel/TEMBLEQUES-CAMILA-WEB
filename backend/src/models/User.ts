import mongoose, { Schema, type Document } from "mongoose";

export type Role = "client" | "owner" | "operator" | "inventory" | "support";
export type PreferredLanguage = "es" | "en";

export interface IUser extends Document {
  clerkId: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  preferredAddress?: string;
  preferredLanguage?: PreferredLanguage;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ["client", "owner", "operator", "inventory", "support"], default: "client" },
    phone: { type: String, trim: true },
    preferredAddress: { type: String, trim: true },
    preferredLanguage: { type: String, enum: ["es", "en"], default: "es" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);
