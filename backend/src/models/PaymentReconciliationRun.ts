import mongoose, { Schema, type Document } from "mongoose";

export interface ReconciliationDifference {
  rentalId: string;
  code: string;
  message: string;
  expectedAmount?: number;
  stripeAmount?: number;
  stripeStatus?: string;
}

export interface IPaymentReconciliationRun extends Document {
  startedAt: Date;
  finishedAt?: Date;
  inspected: number;
  consistent: number;
  inconsistent: number;
  differences: ReconciliationDifference[];
  requestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reconciliationSchema = new Schema<IPaymentReconciliationRun>(
  {
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    inspected: { type: Number, required: true, default: 0 },
    consistent: { type: Number, required: true, default: 0 },
    inconsistent: { type: Number, required: true, default: 0 },
    differences: [
      {
        rentalId: { type: String, required: true },
        code: { type: String, required: true },
        message: { type: String, required: true },
        expectedAmount: { type: Number },
        stripeAmount: { type: Number },
        stripeStatus: { type: String },
      },
    ],
    requestId: { type: String },
  },
  { timestamps: true },
);

reconciliationSchema.index({ startedAt: -1 });

export const PaymentReconciliationRun = mongoose.model<IPaymentReconciliationRun>("PaymentReconciliationRun", reconciliationSchema);
