import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health/dependencies", async (_req, res) => {
  let database: "healthy" | "unavailable" = "unavailable";
  try {
    await pool.query("select 1");
    database = "healthy";
  } catch {
    database = "unavailable";
  }
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

export default router;
