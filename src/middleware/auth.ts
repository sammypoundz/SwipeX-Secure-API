import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AuthPayload {
  /** Customer externalId. */
  sub: string;
  role: "customer" | "admin";
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
}

/** Requires a valid Bearer access token; attaches payload to res.locals.auth. */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  try {
    res.locals.auth = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
