import { Schema, model } from "mongoose";

/**
 * Merchants on the SwipeX network. Presence in this collection with
 * `trusted: true` feeds the merchantTrust risk factor.
 */
const merchantSchema = new Schema(
  {
    /** Public merchant identifier used in authorize requests. */
    externalId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryCode: { type: String }, // ISO 18245 MCC, e.g. "5732"
    country: { type: String },
    /** Trusted partners get a 0 risk contribution; others are penalized. */
    trusted: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Merchant = model("Merchant", merchantSchema);
