import {
  highValueAmountThreshold,
  riskThresholds,
  riskWeights,
} from "../config/risk.js";
import { isHighValue, riskFactors } from "./factors.js";
import type { RiskDecision, RiskFactorContext, RiskScore } from "./types.js";

/**
 * Weighted-sum risk engine.
 *
 * score = Σ (weight_k * normalizedValue_k) * 100, then banding via
 * riskThresholds. A high-value override forces at least CHALLENGE.
 *
 * The engine knows nothing about how a factor computes its value — swap any
 * scorer for an ML model by replacing it in riskFactors.
 */
export function evaluateRisk(ctx: RiskFactorContext): RiskScore {
  const byKey = new Map(riskFactors.map((f) => [f.key, f]));

  let raw = 0; // 0..1
  const factors: RiskScore["factors"] = [];
  const reasons: string[] = [];

  for (const [key, weight] of Object.entries(riskWeights) as Array<
    [keyof typeof riskWeights, number]
  >) {
    const factor = byKey.get(key);
    if (!factor) continue; // weights may list a factor that has no scorer yet
    const value = Math.min(1, Math.max(0, factor.score(ctx)));
    const points = weight * value;
    raw += points;
    factors.push({ key, label: factor.label, value, points });

    if (value >= 0.5 && weight > 0) {
      reasons.push(`${factor.label}: risk signal ${Math.round(value * 100)}%`);
    }
  }

  const score = Math.round(raw * 100);

  let decision: RiskDecision;
  if (score <= riskThresholds.approve) {
    decision = "APPROVED";
  } else if (score <= riskThresholds.challenge) {
    decision = "CHALLENGE";
  } else {
    decision = "DECLINED";
  }

  // Policy override: very large amounts are never silently approved.
  if (decision === "APPROVED" && isHighValue(ctx)) {
    decision = "CHALLENGE";
    reasons.push(
      `High-value transaction (≥ ${highValueAmountThreshold}): forced CHALLENGE`,
    );
  }

  return { score, decision, factors, reasons };
}
