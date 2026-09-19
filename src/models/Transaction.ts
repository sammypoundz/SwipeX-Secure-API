import { Schema, model } from "mongoose";

const transactionSchema = new Schema(
  {
    /** Our internal reference for the transaction. */
    reference: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "NGN" },

    merchantId: { type: String },
    merchantCategoryCode: { type: String },
    merchantCountry: { type: String },

    deviceFingerprint: { type: String },

    decision: {
      type: String,
      required: true,
      enum: ["APPROVED", "CHALLENGE", "DECLINED"],
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    reasons: { type: [String], default: [] },
    /** Per-factor breakdown for audit / model debugging. */
    factorBreakdown: { type: Schema.Types.Mixed, default: [] },

    /** For CHALLENGE decisions: pending | approved | declined by customer. */
    challengeStatus: {
      type: String,
      enum: ["pending", "approved", "declined"],
    },
  },
  { timestamps: true },
);

// Speeds up "recent outcomes for a customer" queries in the risk engine.
transactionSchema.index({ customerId: 1, createdAt: -1 });

export const Transaction = model("Transaction", transactionSchema);
