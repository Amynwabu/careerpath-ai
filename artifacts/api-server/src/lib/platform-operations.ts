import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createPostgresPoolConfig, pool } from "@workspace/db";
import { inspectDatabaseRoleSecurity } from "./database-role-security";

const workerPool = process.env.WORKER_DATABASE_URL
  ? new Pool(createPostgresPoolConfig(process.env.WORKER_DATABASE_URL))
  : pool;

export async function workerDatabaseRoleIsRestricted(): Promise<boolean> {
  return (await inspectDatabaseRoleSecurity(workerPool)).secure;
}

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
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id',$1,true)", [String(input.ownerUserId)]);
    const result = await client.query<{ job_id: string }>(
      `insert into career_data_jobs
       (job_id,job_type,owner_user_id,status,payload,idempotency_key_hash,trace_id,max_attempts,timeout_seconds)
       values ($1,$2,$3,'queued',$4,$5,$6,$7,$8)
       on conflict (job_type,idempotency_key_hash) do update set updated_at=career_data_jobs.updated_at
       returning job_id`,
      [id,input.jobType,input.ownerUserId,input.payload,digest(input.idempotencyKey),
        input.traceId,input.maxAttempts ?? 3,input.timeoutSeconds ?? 300],
    );
    await client.query("commit");
    return result.rows[0]!.job_id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function claimJob(input: {
  workerId: string; jobTypes: string[]; leaseSeconds?: number;
}) {
  if (!input.workerId || !input.jobTypes.length) throw operationError("job_claim_invalid");
  const leaseSeconds = Math.min(Math.max(input.leaseSeconds ?? 300, 1), 3600);
  const result = await workerPool.query<{
    job_id: string; job_type: string; owner_user_id: number | null;
    payload: Record<string, unknown>; attempt_count: number; max_attempts: number;
  }>(
    `with candidate as (
       select job_id from career_data_jobs
       where job_type=any($1::text[]) and (
         (status in ('queued','retry_scheduled') and available_at<=now())
         or (status='running' and locked_at < now()-make_interval(secs=>$2))
       )
       order by available_at,created_at
       for update skip locked limit 1
     )
     update career_data_jobs j set
       status='running',attempt_count=attempt_count+1,locked_at=now(),
       locked_by=$3,updated_at=now()
     from candidate where j.job_id=candidate.job_id
     returning j.job_id,j.job_type,j.owner_user_id,j.payload,j.attempt_count,j.max_attempts`,
    [input.jobTypes, leaseSeconds, input.workerId],
  );
  return result.rows[0];
}

export async function completeJob(input: {
  jobId: string; workerId: string; checkpoint?: Record<string, unknown>;
}) {
  assertSafeJobPayload(input.checkpoint ?? {});
  const client = await workerPool.connect();
  try {
    await client.query("begin");
    if (input.checkpoint) {
      await client.query(
        `insert into career_data_job_checkpoints (job_id,checkpoint_key,checkpoint_value)
         values ($1,'completion',$2)
         on conflict (job_id,checkpoint_key) do update set
           checkpoint_value=excluded.checkpoint_value,updated_at=now()`,
        [input.jobId, input.checkpoint],
      );
    }
    const result = await client.query(
      `update career_data_jobs set
         status='completed',completed_at=now(),locked_at=null,locked_by=null,updated_at=now()
       where job_id=$1 and status='running' and locked_by=$2
       returning job_id`,
      [input.jobId, input.workerId],
    );
    if (!result.rowCount) throw operationError("job_lease_not_owned");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function failJob(input: {
  jobId: string; workerId: string; errorCode: string; retryDelaySeconds?: number;
}) {
  const retryDelaySeconds = Math.min(Math.max(input.retryDelaySeconds ?? 30, 0), 3600);
  const result = await workerPool.query<{ status: string }>(
    `update career_data_jobs set
       status=case when attempt_count>=max_attempts then 'dead_letter' else 'retry_scheduled' end,
       available_at=case when attempt_count>=max_attempts then available_at
         else now()+make_interval(secs=>$3) end,
       last_error_code=$4,locked_at=null,locked_by=null,updated_at=now()
     where job_id=$1 and status='running' and locked_by=$2
     returning status`,
    [input.jobId, input.workerId, retryDelaySeconds, input.errorCode.slice(0, 80)],
  );
  if (!result.rows[0]) throw operationError("job_lease_not_owned");
  return result.rows[0].status;
}

export async function cancelJob(jobId: string, ownerUserId: number) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id',$1,true)", [String(ownerUserId)]);
    const result = await client.query(
      `update career_data_jobs set
         status='cancelled',locked_at=null,locked_by=null,updated_at=now()
       where job_id=$1 and owner_user_id=$2
         and status in ('queued','retry_scheduled')
       returning job_id`,
      [jobId, ownerUserId],
    );
    if (!result.rowCount) throw operationError("job_not_cancellable");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePlatformWorkerPool() {
  if (workerPool !== pool) await workerPool.end();
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
