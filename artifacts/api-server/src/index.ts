import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "Shutdown signal received");

  const timeout = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown timed out");
    process.exit(1);
  }, Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000));

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error closing HTTP server");
      clearTimeout(timeout);
      process.exit(1);
    }

    try {
      await pool.end();
      logger.info("Database pool closed");
      clearTimeout(timeout);
      process.exit(0);
    } catch (poolErr) {
      logger.error({ err: poolErr }, "Error closing database pool");
      clearTimeout(timeout);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
