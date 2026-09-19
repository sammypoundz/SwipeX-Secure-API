import type { RiskFactorWeights } from "../config/risk.js";

/** Everything a scorer may need to evaluate a transaction. */
export interface RiskFactorContext {
  /** Authenticated customer making the request (null = anonymous / unknown device). */
  customerId: string | null;
  /** Device fingerprint hash reported by the mobile SDK. */
  deviceFingerprint: string | null;
  /** True when the device has been seen on this account before. */
  deviceKnown: boolean;
  /** True when the device failed integrity / emulator / root checks. */
  deviceCompromised: boolean;
  /** True when the transaction is linked to a recently swapped SIM. */
  simSwappedRecently: boolean;
  /** Transaction amount in major units (e.g. NGN). */
  amount: number;
  /** ISO-4217 currency, e.g. "NGN". */
  currency: string;
  /** Merchant identifier or category (MCC). */
  merchantId: string | null;
  merchantCategoryCode: string | null;
  /** ISO country of the merchant / acquiring side, e.g. "NG". */
  merchantCountry: string | null;
  /** Merchant on our allowlist of known-trusted partners. */
  merchantTrusted: boolean;
  /** Customer's country of usual residence. */
  homeCountry: string | null;
  /** Coordinates or country of the initiating device, if available. */
  locationCountry: string | null;
  locationLatencySuspicious: boolean;
  /** Hour of the transaction in the customer's local timezone (0-23). */
  hourLocal: number;
  /** Outcomes of the customer's previous transactions, newest last. */
  recentOutcomes: Array<"approved" | "declined" | "charged_back">;
}

/**
 * A single risk factor. The engine only depends on this interface, so any
 * factor can later be replaced by an ML model without touching the engine.
 */
export interface RiskFactor {
  /** Must match a key of RiskFactorWeights. */
  readonly key: keyof RiskFactorWeights;
  /** Human-readable name for audit logs and the reasons array. */
  readonly label: string;
  /**
   * Normalized risk contribution in [0, 1]; 0 = no risk signal,
   * 1 = highest risk contribution for this factor.
   */
  score(ctx: RiskFactorContext): number;
}

export type RiskDecision = "APPROVED" | "CHALLENGE" | "DECLINED";

export interface RiskScore {
  /** Final 0-100 score, higher = riskier. */
  score: number;
  decision: RiskDecision;
  /** Per-factor breakdown, useful for explainability and debugging. */
  factors: Array<{
    key: RiskFactor["key"];
    label: string;
    /** Raw normalized value in [0, 1]. */
    value: number;
    /** weight * value points contributed to the final score. */
    points: number;
  }>;
  /** Human-readable reasons the score landed where it did. */
  reasons: string[];
}
