import { Schema, model } from "mongoose";

/**
 * A device that has been seen making requests for an account. Devices are
 * fingerprinted by the mobile SDK; the hash is deterministic per device.
 */
const deviceSchema = new Schema(
  {
    customerId: { type: String, required: true, index: true },
    /** Deterministic hash of device attributes — never store raw attributes. */
    fingerprint: { type: String, required: true },
    name: { type: String }, // e.g. "iPhone 14, Chrome 126"
    /** Failed integrity / emulator / root checks at least once. */
    compromised: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// A device fingerprint is unique per customer.
deviceSchema.index({ customerId: 1, fingerprint: 1 }, { unique: true });

export const Device = model("Device", deviceSchema);
