import { Router } from "express";
import { z } from "zod";
import { logger } from "../config/logger.js";
import { requireAuth } from "../middleware/auth.js";
import { Device } from "../models/Device.js";
import { Merchant } from "../models/Merchant.js";
import { Transaction } from "../models/Transaction.js";
import { evaluateRisk } from "../risk/engine.js";
import { verifySignal } from "../risk/signalProviders.js";
import type { RiskFactorContext } from "../risk/types.js";

const authorizeSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default("NGN"),
  deviceFingerprint: z.string().min(1),
  merchantId: z.string().optional(),
  merchantCategoryCode: z.string().optional(),
  merchantCountry: z.string().length(2).optional(),
  homeCountry: z.string().length(2).optional(),
  locationCountry: z.string().length(2).optional(),
  locationLatencySuspicious: z.boolean().default(false),
  hourLocal: z.number().int().min(0).max(23),
  /** Client-reported signals we verify server-side where possible. */
  simSwappedRecently: z.boolean().default(false),
});

export const transactionsRouter = Router();

transactionsRouter.post("/authorize", requireAuth, async (req, res) => {
  const parsed = authorizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const input = parsed.data;
  // customerId always comes from the verified token, never the body.
  const customerId = res.locals.auth.sub;

  try {
    // --- Gather server-side signals -------------------------------------
    const [device, merchant, recent] = await Promise.all([
      Device.findOne({
        customerId,
        fingerprint: input.deviceFingerprint,
      }),
      input.merchantId
        ? Merchant.findOne({ externalId: input.merchantId }).lean()
        : Promise.resolve(null),
      Transaction.find(
        { customerId },
        { decision: 1, challengeStatus: 1, _id: 0 },
      )
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const recentOutcomes = recent.map((t) =>
      t.decision === "APPROVED"
        ? ("approved" as const)
        : t.decision === "DECLINED"
          ? ("declined" as const)
          : // CHALLENGE the customer confirmed = fine; abandoned/declined ≈ charged_back risk
            t.challengeStatus === "approved"
            ? ("approved" as const)
            : ("charged_back" as const),
    );

    // Verify client-reported signals through the provider registry.
    // Device integrity is verified server-side; we ignore the client claim
    // entirely for that signal.
    const [simSwappedRecently, deviceIntegrityFailed] = await Promise.all([
      verifySignal("sim_swap", {
        customerId,
        deviceFingerprint: input.deviceFingerprint,
        claimed: input.simSwappedRecently,
      }),
      device
        ? verifySignal("device_integrity", {
            customerId,
            deviceFingerprint: input.deviceFingerprint,
            claimed: device.compromised,
          })
        : Promise.resolve(false),
    ]);

    const ctx: RiskFactorContext = {
      customerId,
      deviceFingerprint: input.deviceFingerprint,
      deviceKnown: Boolean(device),
      deviceCompromised: deviceIntegrityFailed || (device?.compromised ?? false),
      simSwappedRecently,
      amount: input.amount,
      currency: input.currency,
      merchantId: input.merchantId ?? null,
      merchantCategoryCode: input.merchantCategoryCode ?? merchant?.categoryCode ?? null,
      merchantCountry: input.merchantCountry ?? merchant?.country ?? null,
      merchantTrusted: Boolean(merchant?.trusted && merchant?.active),
      homeCountry: input.homeCountry ?? null,
      locationCountry: input.locationCountry ?? null,
      locationLatencySuspicious: input.locationLatencySuspicious,
      hourLocal: input.hourLocal,
      recentOutcomes,
    };

    // --- Score & persist -------------------------------------------------
    const result = evaluateRisk(ctx);

    // Auto-register a previously unseen device so it counts as known next time.
    if (!device) {
      await Device.create({ customerId, fingerprint: input.deviceFingerprint });
      logger.info({ customerId }, "new device registered");
    }

    const reference = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await Transaction.create({
      reference,
      customerId,
      amount: input.amount,
      currency: input.currency,
      merchantId: input.merchantId,
      merchantCategoryCode: input.merchantCategoryCode,
      merchantCountry: input.merchantCountry,
      deviceFingerprint: input.deviceFingerprint,
      decision: result.decision,
      score: result.score,
      reasons: result.reasons,
      factorBreakdown: result.factors,
      challengeStatus: result.decision === "CHALLENGE" ? "pending" : undefined,
    });

    logger.info(
      { reference, decision: result.decision, score: result.score },
      "transaction scored",
    );
    return res.status(200).json({ reference, ...result });
  } catch (err) {
    logger.error({ err }, "authorize failed");
    return res.status(500).json({ error: "Internal error" });
  }
});

/** Look up a previous authorization by reference. */
transactionsRouter.get(
  "/:reference",
  requireAuth,
  async (req, res) => {
    const customerId = res.locals.auth.sub;
    const tx = await Transaction.findOne({
      reference: req.params.reference,
      customerId, // scoping to the caller prevents ID enumeration
    }).lean();
    if (!tx) return res.status(404).json({ error: "Not found" });
    return res.json(tx);
  },
);

/** Customer confirms or declines a CHALLENGE decision. */
const challengeSchema = z.object({
  approved: z.boolean(),
});

transactionsRouter.post(
  "/:reference/challenge",
  requireAuth,
  async (req, res) => {
    const parsed = challengeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const customerId = res.locals.auth.sub;

    const tx = await Transaction.findOne({
      reference: req.params.reference,
      customerId,
    });
    if (!tx) return res.status(404).json({ error: "Not found" });
    if (tx.decision !== "CHALLENGE") {
      return res
        .status(409)
        .json({ error: "Transaction is not awaiting challenge confirmation" });
    }
    if (tx.challengeStatus !== "pending") {
      return res.status(409).json({ error: "Challenge already resolved" });
    }

    tx.challengeStatus = parsed.data.approved ? "approved" : "declined";
    await tx.save();
    logger.info(
      { reference: tx.reference, challengeStatus: tx.challengeStatus },
      "challenge resolved",
    );
    return res.json({ reference: tx.reference, challengeStatus: tx.challengeStatus });
  },
);

// Health endpoint used by docker-compose / uptime checks.
