import { app } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT} (${env.API_PREFIX})`);
});

// Fail fast if the DB is unreachable, but keep the process exit clean.
connectDB().catch((err) => {
  logger.error({ err }, "Failed to connect to MongoDB");
  process.exit(1);
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down");
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
