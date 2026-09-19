import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default("/api/v1"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS: z.string().default("*"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z
    .string()
    .default("./firebase-service-account.json"),
  FCM_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  LOG_LEVEL: z.string().default("info"),
  RISK_APPROVE_THRESHOLD: z.coerce.number().default(35),
  RISK_CHALLENGE_THRESHOLD: z.coerce.number().default(70),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
