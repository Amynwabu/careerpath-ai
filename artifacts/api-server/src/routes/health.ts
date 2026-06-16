import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res) => {
  try {
    const { rows } = await pool.query<{ users_table: string | null }>(
      "select to_regclass('public.users')::text as users_table",
    );
    const hasUsersTable = rows[0]?.users_table === "users";

    res.status(hasUsersTable ? 200 : 503).json({
      status: hasUsersTable ? "ok" : "schema_missing",
      database: "reachable",
      requiredTables: {
        users: hasUsersTable,
      },
    });
  } catch {
    res.status(503).json({
      status: "unavailable",
      database: "unreachable",
      requiredTables: {
        users: false,
      },
    });
  }
});

export default router;
