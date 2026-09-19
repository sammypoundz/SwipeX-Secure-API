import pino from "pino";
import { env, isProd } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "swipex-secure", env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.x-api-key",
      "*.password",
      "*.apiKey",
      "*.pin",
    ],
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
});
