import { connectDB, disconnectDB } from "../config/db.js";
import { Merchant } from "../models/Merchant.js";

/**
 * Seeds a small set of trusted merchants. Safe to re-run (upsert by externalId).
 * Usage: npx tsx src/scripts/seed-merchants.ts
 */
const merchants = [
  {
    externalId: "mtn-data",
    name: "MTN Nigeria",
    categoryCode: "4814",
    country: "NG",
    trusted: true,
  },
  {
    externalId: "gtb-transfer",
    name: "GTBank Transfer",
    categoryCode: "6012",
    country: "NG",
    trusted: true,
  },
  {
    externalId: "jumia-ng",
    name: "Jumia Nigeria",
    categoryCode: "5942",
    country: "NG",
    trusted: true,
  },
];

async function main(): Promise<void> {
  await connectDB();
  for (const m of merchants) {
    await Merchant.updateOne(
      { externalId: m.externalId },
      { $set: m },
      { upsert: true },
    );
  }
  console.log(`Seeded ${merchants.length} trusted merchants`);
  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
