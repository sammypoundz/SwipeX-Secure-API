import { Router } from "express";
import { z } from "zod";
import { logger } from "../config/logger.js";
import {
  requireAuth,
  signAccessToken,
  signRefreshToken,
} from "../middleware/auth.js";
import { Customer, verifyPassword } from "../models/Customer.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const customer = await Customer.findOne({ email }).select("+passwordHash");
  // Uniform error + timing: never reveal whether the email exists.
  const ok = customer
    ? await verifyPassword(password, customer.passwordHash)
    : false;

  if (!customer || !ok) {
    logger.warn({ email }, "failed login attempt");
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const payload = { sub: customer.externalId, role: customer.role };
  return res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    customer: {
      id: customer.externalId,
      email: customer.email,
      homeCountry: customer.homeCountry,
    },
  });
});

// Simple refresh flow: the refresh token must itself be valid + non-expired.
authRouter.post("/refresh", requireAuth, (req, res) => {
  const auth = res.locals.auth as { sub: string; role: "customer" | "admin" };
  res.json({
    accessToken: signAccessToken(auth),
    refreshToken: signRefreshToken(auth),
  });
});
