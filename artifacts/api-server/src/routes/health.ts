import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { runtimeConfig } from "../lib/runtime-config";
import { inspectDatabaseRoleSecurity } from "../lib/database-role-security";
import { workerDatabaseRoleIsRestricted } from "../lib/platform-operations";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
router.get("/live", (_req, res) => res.json({
  status: "ok", service: "careerpathx-api",
  version: runtimeConfig.applicationVersion,
}));
router.get("/ready", async (_req, res) => {
  const database = await databaseStatus();
  res.status(database === "healthy" ? 200 : 503).json({
    status: database === "healthy" ? "ready" : "not_ready",
    dependencies: { database },
  });
});
router.get("/health/database", detailedHealth, async (_req, res) => {
  const database = await databaseStatus();
  res.status(database === "healthy" ? 200 : 503).json({ status: database });
});
router.get("/health/storage", detailedHealth, (_req, res) => {
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CAREER_DOCUMENT_BUCKET);
  res.status(configured ? 200 : 503).json({ status: configured ? "configured" : "not_configured" });
});
router.get("/health/jobs", detailedHealth, async (_req, res) => {
  try {
    const result = await pool.query<{ queued: string }>(
      "select count(*)::text as queued from career_data_jobs where status in ('queued','retry_scheduled')",
    );
    res.json({ status: "healthy", queued: Number(result.rows[0]?.queued ?? 0) });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

router.get("/health/dependencies", async (_req, res) => {
  const database = await databaseStatus();
  const objectStorageConfigured = Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.CAREER_DOCUMENT_BUCKET,
  );
  const scannerConfigured = Boolean(
    process.env.CAREER_MALWARE_SCANNER_URL &&
    process.env.CAREER_MALWARE_SCANNER_API_KEY,
  );
  res.status(database === "healthy" ? 200 : 503).json({
    status: database === "healthy" ? "degraded" : "unavailable",
    dependencies: {
      database,
      objectStorage: objectStorageConfigured ? "degraded" : "not_configured",
      malwareScanner: scannerConfigured ? "degraded" : "not_configured",
      retentionWorkerConfiguration: process.env.CAREER_RETENTION_ENABLED === "true"
        ? "degraded"
        : "not_configured",
      authenticationProvider: process.env.JWT_SECRET ? "healthy" : "degraded",
      taxonomyProvider: "degraded",
    },
  });
});

async function databaseStatus(): Promise<"healthy"|"unavailable"> {
  try {
    await pool.query("select 1");
    if (["staging", "production"].includes(runtimeConfig.environment)) {
      const [runtimeRole, workerRole] = await Promise.all([
        inspectDatabaseRoleSecurity(pool),
        workerDatabaseRoleIsRestricted(),
      ]);
      if (!runtimeRole.secure || !workerRole) return "unavailable";
    }
    return "healthy";
  } catch { return "unavailable"; }
}
function detailedHealth(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (!["staging","production"].includes(runtimeConfig.environment)) return next();
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (token && req.headers["x-health-check-token"] === token) return next();
  res.status(404).json({ error: "Not found" });
}

export default router;
