import { createHash, randomUUID } from "node:crypto";
import { pool } from "@workspace/db";

export async function consumeQuota(input: {
  ownerUserId: number; dimension: string; limit: number; units?: number;
  periodStart: Date; periodEnd: Date; idempotencyKey: string; entitlementSnapshot: object;
}) {
  const units = input.units ?? 1;
  if (units < 1 || input.limit < 0) throw operationError("quota_invalid");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id',$1,true)", [String(input.ownerUserId)]);
    const hash = digest(input.idempotencyKey);
    const replay = await client.query<{ status: string }>(
      `select status from career_data_quota_consumptions
       where owner_user_id=$1 and quota_dimension=$2 and period_start=$3 and idempotency_key_hash=$4`,
      [input.ownerUserId,input.dimension,input.periodStart,hash],
    );
    if (replay.rows[0]) { await client.query("commit"); return { replayed: true }; }
    await client.query(
      `insert into career_data_quota_usage
       (owner_user_id,quota_dimension,period_start,period_end,entitlement_snapshot)
       values ($1,$2,$3,$4,$5)
       on conflict (owner_user_id,quota_dimension,period_start) do nothing`,
      [input.ownerUserId,input.dimension,input.periodStart,input.periodEnd,input.entitlementSnapshot],
    );
    const updated = await client.query<{ consumed: number }>(
      `update career_data_quota_usage set consumed=consumed+$1,record_version=record_version+1,updated_at=now()
       where owner_user_id=$2 and quota_dimension=$3 and period_start=$4 and consumed+$1<=$5
       returning consumed`,
      [units,input.ownerUserId,input.dimension,input.periodStart,input.limit],
    );
    if (!updated.rows[0]) throw operationError("quota_exceeded");
    await client.query(
      `insert into career_data_quota_consumptions
       (consumption_id,owner_user_id,quota_dimension,period_start,idempotency_key_hash,units,status)
       values ($1,$2,$3,$4,$5,$6,'consumed')`,
      [`quota_${randomUUID()}`,input.ownerUserId,input.dimension,input.periodStart,hash,units],
    );
    await client.query("commit");
    return { replayed: false, consumed: updated.rows[0].consumed, remaining: input.limit-updated.rows[0].consumed };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function enqueueJob(input: {
  ownerUserId: number; jobType: string; payload: Record<string, unknown>;
  idempotencyKey: string; traceId: string; maxAttempts?: number; timeoutSeconds?: number;
}) {
  assertSafeJobPayload(input.payload);
  const id = `job_${randomUUID()}`;
  const result = await pool.query<{ job_id: string }>(
    `insert into career_data_jobs
     (job_id,job_type,owner_user_id,status,payload,idempotency_key_hash,trace_id,max_attempts,timeout_seconds)
     values ($1,$2,$3,'queued',$4,$5,$6,$7,$8)
     on conflict (job_type,idempotency_key_hash) do update set updated_at=career_data_jobs.updated_at
     returning job_id`,
    [id,input.jobType,input.ownerUserId,input.payload,digest(input.idempotencyKey),
      input.traceId,input.maxAttempts ?? 3,input.timeoutSeconds ?? 300],
  );
  return result.rows[0]!.job_id;
}

export function currentQuotaPeriod(now = new Date()) {
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 1)),
  };
}

export function assertSafeJobPayload(payload: Record<string, unknown>) {
  const forbidden = /(^|_)(cv|resume|response|evidence|note|password|token|secret|content|text|signed_url)($|_)/i;
  for (const [key,value] of Object.entries(payload)) {
    const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
    if (forbidden.test(normalizedKey)) throw operationError("unsafe_job_payload");
    if (typeof value === "string" && value.length > 512) throw operationError("unsafe_job_payload");
  }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function operationError(code: string) { return Object.assign(new Error(code), { code }); }
