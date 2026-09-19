import { logger } from "../config/logger.js";

/**
 * Server-side verification of client-reported risk signals.
 *
 * The authorize endpoint receives signals like "SIM swapped recently" from
 * the mobile SDK, but those must never be trusted blindly. Implement this
 * interface with a real telco / NIBSS / device-attestation integration and
 * register it in `signalProviders` below — nothing else changes.
 */
export interface SignalProvider {
  readonly name: string;
  /** Returns true when the signal is confirmed server-side. */
  verify(signal: SignalQuery): Promise<boolean>;
}

export interface SignalQuery {
  kind: "sim_swap" | "device_integrity";
  customerId: string;
  deviceFingerprint: string;
  /** Client-claimed value, used as a hint by some providers. */
  claimed: boolean;
}

/**
 * Default provider used in development: accepts the client's claim.
 * This is the ONLY provider that trusts the client, and it must never
 * run in production.
 */
export const clientReportedProvider: SignalProvider = {
  name: "client-reported",
  async verify({ kind, claimed }) {
    if (claimed) {
      logger.warn(
        { kind },
        "using CLIENT-REPORTED signal — not safe for production",
      );
    }
    return claimed;
  },
};

/**
 * Template for a real integration, e.g. a SIM-swap check API:
 *
 * export const telcoSimSwapProvider: SignalProvider = {
 *   name: "telco-sim-swap",
 *   async verify({ customerId, claimed }) {
 *     const swapped = await telcoClient.checkSimSwap(msisdnOf(customerId));
 *     return swapped;
 *   },
 * };
 */

/** Provider registry — replace entries per environment via env config later. */
export const signalProviders: Record<SignalQuery["kind"], SignalProvider> = {
  sim_swap: clientReportedProvider,
  device_integrity: clientReportedProvider,
};

/** Convenience wrapper used by the authorize route. */
export async function verifySignal(
  kind: SignalQuery["kind"],
  query: Omit<SignalQuery, "kind">,
): Promise<boolean> {
  try {
    return await signalProviders[kind].verify({ ...query, kind });
  } catch (err) {
    // Fail closed for security signals: if the provider errors, assume risk.
    logger.error({ err, kind }, "signal provider failed — failing closed");
    return true;
  }
}
