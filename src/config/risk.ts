/**
 * Risk engine configuration.
 *
 * Each factor contributes `weight * normalizedValue` points, where
 * `normalizedValue` is in [0, 1] (1 = highest risk contribution).
 * Weights must sum to <= 1; any remainder is treated as "neutral".
 *
 * This file is the single place to tune scoring rules, or to swap a
 * factor's scorer for an ML model later — the engine only depends on
 * the RiskFactor interface, not on how a factor computes its value.
 */
import { env } from "./env.js";
export interface RiskFactorWeights {
  deviceIdentity: number;
  simLinkedIdentity: number;
  behavioralPattern: number;
  transactionAmount: number;
  merchantTrust: number;
  location: number;
  timeOfDay: number;
  historicalData: number;
}

export const riskWeights: RiskFactorWeights = {
  deviceIdentity: 0.2,
  simLinkedIdentity: 0.1,
  behavioralPattern: 0.15,
  transactionAmount: 0.2,
  merchantTrust: 0.1,
  location: 0.1,
  timeOfDay: 0.05,
  historicalData: 0.1,
};

/** Risk band boundaries applied to the final 0-100 score (tunable via env). */
export const riskThresholds = {
  approve: env.RISK_APPROVE_THRESHOLD, // score <= approve -> APPROVED
  challenge: env.RISK_CHALLENGE_THRESHOLD, // <= challenge -> CHALLENGE, above -> DECLINED
};

/** Amount (in major units, e.g. NGN) above which we always challenge at minimum. */
export const highValueAmountThreshold = 1_000_000;
