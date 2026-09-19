import { connectDB, disconnectDB } from "../config/db.js";
import { Customer, hashPassword } from "../models/Customer.js";

/**
 * Seeds one test customer. Safe to re-run — it upserts by email.
 * Usage: npx tsx src/scripts/seed-test-customer.ts
 */
async function main(): Promise<void> {
  await connectDB();
  const email = "test@swipex.africa";
  const passwordHash = await hashPassword("TestPass123!");

  await Customer.updateOne(
    { email },
    {
      $setOnInsert: {
        email,
        passwordHash,
        externalId: "CUS-TEST-001",
        homeCountry: "NG",
      },
    },
    { upsert: true },
  );

  console.log("Seeded test customer: test@swipex.africa / TestPass123!");
  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
