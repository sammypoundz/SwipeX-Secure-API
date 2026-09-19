import { highValueAmountThreshold } from "../config/risk.js";
import type { RiskFactor, RiskFactorContext } from "./types.js";

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Devices we have never seen on this account before. */
const deviceIdentity: RiskFactor = {
  key: "deviceIdentity",
  label: "Device identity",
  score(ctx) {
    if (ctx.deviceCompromised) return 1;
    if (!ctx.deviceKnown) return 0.8;
    return 0;
  },
};

/** SIM swap is a strong account-takeover signal in Nigerian markets. */
const simLinkedIdentity: RiskFactor = {
  key: "simLinkedIdentity",
  label: "SIM-linked identity",
  score(ctx) {
    return ctx.simSwappedRecently ? 1 : 0;
  },
};

/**
 * Behavioural deviation: how much does this transaction deviate from the
 * customer's normal pattern (declines, chargebacks, bursty spending)?
 */
const behavioralPattern: RiskFactor = {
  key: "behavioralPattern",
  label: "Behavioral pattern",
  score(ctx) {
    if (ctx.recentOutcomes.length === 0) return 0.1; // new customer, low signal
    const declined = ctx.recentOutcomes.filter((o) => o === "declined").length;
    const chargebacks = ctx.recentOutcomes.filter(
      (o) => o === "charged_back",
    ).length;
    return clamp01(
      (declined / ctx.recentOutcomes.length) * 0.6 + chargebacks * 0.4,
    );
  },
};

/** Log-scaled amount: 100k => ~0.83, 1M+ => 1. */
const transactionAmount: RiskFactor = {
  key: "transactionAmount",
  label: "Transaction amount",
  score(ctx) {
    const amount = Math.max(0, ctx.amount);
    if (amount === 0) return 0;
    return clamp01(Math.log10(amount + 1) / 6);
  },
};

const merchantTrust: RiskFactor = {
  key: "merchantTrust",
  label: "Merchant trust",
  score(ctx) {
    if (ctx.merchantTrusted) return 0;
    if (!ctx.merchantId && !ctx.merchantCategoryCode) return 0.7; // unknown payee
    return 0.4;
  },
};

const location: RiskFactor = {
  key: "location",
  label: "Location",
  score(ctx) {
    let risk = 0;
    if (
      ctx.homeCountry &&
      ctx.locationCountry &&
      ctx.locationCountry !== ctx.homeCountry
    ) {
      risk += 0.7;
    }
    if (ctx.locationLatencySuspicious) risk += 0.3;
    return clamp01(risk);
  },
};

/** Odd-hour heuristic for the customer's local timezone. */
const timeOfDay: RiskFactor = {
  key: "timeOfDay",
  label: "Time of day",
  score(ctx) {
    const h = ctx.hourLocal;
    if (h >= 0 && h < 5) return 1; // 00:00-04:59
    if (h >= 23) return 0.6; // 23:00-23:59
    return 0;
  },
};

const historicalData: RiskFactor = {
  key: "historicalData",
  label: "Historical data",
  score(ctx) {
    if (ctx.customerId) return 0;
    // Anonymous / unauthenticated request: no history to lean on.
    return 1;
  },
};

/** Ordered for readability in the score breakdown; the engine looks up by key. */
export const riskFactors: readonly RiskFactor[] = [
  deviceIdentity,
  simLinkedIdentity,
  behavioralPattern,
  transactionAmount,
  merchantTrust,
  location,
  timeOfDay,
  historicalData,
];

/** Amounts at or above this always get at least a CHALLENGE, whatever the score. */
export function isHighValue(ctx: RiskFactorContext): boolean {
  return ctx.amount >= highValueAmountThreshold;
}

export type { RiskFactorContext };
