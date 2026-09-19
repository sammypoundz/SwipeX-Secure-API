import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";

const customerSchema = new Schema(
  {
    /** Public identifier used in API requests (not the Mongo _id). */
    externalId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    /** Country of usual residence, used by the location risk factor. */
    homeCountry: { type: String },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true },
);

export const Customer = model("Customer", customerSchema);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
