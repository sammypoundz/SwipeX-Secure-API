import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { transactionsRouter } from "./routes/transactions.js";
import { authRouter } from "./routes/auth.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(","),
  }),
);
app.use(express.json({ limit: "100kb" }));

// Basic abuse protection on the authorization endpoint.
app.use(
  "/authorize",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.use(env.API_PREFIX, authRouter);
app.use(env.API_PREFIX + "/transactions", transactionsRouter);
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV });
});

export { app };
