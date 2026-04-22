import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITermsAcceptance extends Document {
  user_id: Types.ObjectId;
  rental_id: Types.ObjectId;
  accepted_at: Date;
  ip_address: string;
  user_agent: string;
}

const termsAcceptanceSchema = new Schema<ITermsAcceptance>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rental_id: { type: Schema.Types.ObjectId, ref: "Rental", required: true },
  accepted_at: { type: Date, required: true, default: Date.now },
  ip_address: { type: String, required: true },
  user_agent: { type: String, required: true },
});

termsAcceptanceSchema.index({ rental_id: 1 });
termsAcceptanceSchema.index({ accepted_at: 1 });

export const TermsAcceptance = mongoose.model<ITermsAcceptance>("TermsAcceptance", termsAcceptanceSchema);
