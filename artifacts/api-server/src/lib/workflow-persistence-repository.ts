import { createHash, randomUUID } from "node:crypto";
import { recordWorkflowMetric } from "./workflow-observability";
import { actorQuery } from "./database-actor-context";

export type WorkflowDomain = "opportunity" | "application" | "interview";
type SessionTable =
  | "career_data_opportunity_sessions"
  | "career_data_cv_optimisation_sessions"
  | "career_data_interview_sessions";

const sessionTables: Record<WorkflowDomain, { table: SessionTable; id: string }> = {
  opportunity: { table: "career_data_opportunity_sessions", id: "opportunity_session_id" },
  application: { table: "career_data_cv_optimisation_sessions", id: "cv_optimisation_session_id" },
  interview: { table: "career_data_interview_sessions", id: "interview_session_id" },
};

export function contentHash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export async function replayIdempotency(input: {
  ownerUserId: number; domain: WorkflowDomain; operation: string; key: string;
}) {
  const result = await actorQuery<{ resource_id: string }>(input.ownerUserId,
    `SELECT resource_id FROM career_data_workflow_idempotency
     WHERE owner_user_id=$1 AND domain=$2 AND operation=$3 AND key_hash=$4 AND expires_at>now()`,
    [input.ownerUserId, input.domain, input.operation, contentHash(input.key)],
  );
  return result.rows[0]?.resource_id;
}

export async function rememberIdempotency(input: {
  ownerUserId: number; domain: WorkflowDomain; operation: string; key: string; resourceId: string;
}) {
  await actorQuery(input.ownerUserId,
    `INSERT INTO career_data_workflow_idempotency
      (owner_user_id,domain,operation,key_hash,resource_id,expires_at)
     VALUES ($1,$2,$3,$4,$5,now()+interval '24 hours')
     ON CONFLICT (owner_user_id,domain,operation,key_hash) DO NOTHING`,
    [input.ownerUserId, input.domain, input.operation, contentHash(input.key), input.resourceId],
  );
}

export async function createWorkflowSession<T extends { recordVersion: number }>(input: {
  domain: WorkflowDomain; ownerUserId: number; sessionId: string; status: string; payload: T;
  engineVersion?: string; taxonomyVersion?: string; sourceVersion?: string;
}) {
  const target = sessionTables[input.domain];
  await actorQuery(input.ownerUserId,
    `INSERT INTO ${target.table}
      (${target.id},owner_user_id,session_status,payload,source_version,engine_version,taxonomy_version,record_version,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$2,$2)`,
    [input.sessionId, input.ownerUserId, input.status, input.payload,
      input.sourceVersion ?? "1", input.engineVersion ?? "deterministic-v1",
      input.taxonomyVersion ?? "published", input.payload.recordVersion],
  );
  recordWorkflowMetric(`${input.domain === "application" ? "cv" : input.domain}_sessions_created` as
    "opportunity_sessions_created"|"cv_sessions_created"|"interview_sessions_created");
  return input.payload;
}

export async function getWorkflowSession<T>(
  domain: WorkflowDomain, ownerUserId: number, sessionId: string,
): Promise<T | undefined> {
  const target = sessionTables[domain];
  const result = await actorQuery<{ payload: T }>(ownerUserId,
    `SELECT payload FROM ${target.table}
     WHERE ${target.id}=$1 AND owner_user_id=$2 AND deleted_at IS NULL`,
    [sessionId, ownerUserId],
  );
  return result.rows[0]?.payload;
}

export async function listWorkflowSessions<T>(domain: WorkflowDomain, ownerUserId: number): Promise<T[]> {
  const target = sessionTables[domain];
  const result = await actorQuery<{ payload: T }>(ownerUserId,
    `SELECT payload FROM ${target.table}
     WHERE owner_user_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC`,
    [ownerUserId],
  );
  return result.rows.map((row) => row.payload);
}

export async function saveWorkflowSession<T extends { recordVersion: number }>(input: {
  domain: WorkflowDomain; ownerUserId: number; sessionId: string; status: string;
  expectedVersion: number; payload: T;
}) {
  const target = sessionTables[input.domain];
  const result = await actorQuery(input.ownerUserId,
    `UPDATE ${target.table}
     SET payload=$1,session_status=$2,record_version=$3,updated_by=$4,updated_at=now()
     WHERE ${target.id}=$5 AND owner_user_id=$4 AND record_version=$6 AND deleted_at IS NULL`,
    [input.payload, input.status, input.payload.recordVersion, input.ownerUserId,
      input.sessionId, input.expectedVersion],
  );
  if (result.rowCount !== 1) {
    recordWorkflowMetric("version_conflicts");
    throw coded("record_version_conflict");
  }
  return input.payload;
}

export async function persistWorkflowResource(input: {
  resourceId: string; ownerUserId: number; domain: WorkflowDomain; resourceType: string;
  parentSessionId: string; payload: unknown; sourceRecordId?: string; recordVersion?: number;
  engineVersion?: string; taxonomyVersion?: string; supersedesResourceId?: string;
}) {
  await actorQuery(input.ownerUserId,
    `INSERT INTO career_data_workflow_resources
      (workflow_resource_id,owner_user_id,domain,resource_type,parent_session_id,
       source_record_id,source_version,engine_version,taxonomy_version,record_version,
       content_hash,payload,supersedes_resource_id,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$2)
     ON CONFLICT (workflow_resource_id) DO NOTHING`,
    [input.resourceId, input.ownerUserId, input.domain, input.resourceType,
      input.parentSessionId, input.sourceRecordId ?? null, String(input.recordVersion ?? 1),
      input.engineVersion ?? "deterministic-v1", input.taxonomyVersion ?? "published",
      input.recordVersion ?? 1, contentHash(input.payload), input.payload,
      input.supersedesResourceId ?? null],
  );
  const metrics = {
    job_match_analysis: "opportunity_analyses_completed",
    cv_draft: "cv_drafts_generated",
    application_readiness: "application_readiness_calculated",
    interview_response: "interview_responses_created",
    interview_readiness: "interview_readiness_calculated",
  } as const;
  const metric = metrics[input.resourceType as keyof typeof metrics];
  if (metric) recordWorkflowMetric(metric);
}

export async function createWorkflowExport(input: {
  ownerUserId: number; domain: WorkflowDomain; parentSessionId: string;
  sourceResourceId?: string; format: string; payload: unknown;
}) {
  const exportId = randomUUID();
  const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
    ? { ...(input.payload as Record<string, unknown>), exportId }
    : input.payload;
  await actorQuery(input.ownerUserId,
    `INSERT INTO career_data_workflow_exports
      (workflow_export_id,owner_user_id,domain,parent_session_id,source_resource_id,
       export_format,payload,content_hash,expires_at,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '15 minutes',$2)`,
    [exportId, input.ownerUserId, input.domain, input.parentSessionId,
      input.sourceResourceId ?? null, input.format, payload, contentHash(payload)],
  );
  return exportId;
}

export async function getWorkflowExport<T>(
  ownerUserId: number, domain: WorkflowDomain, exportId: string,
) {
  const result = await actorQuery<{ payload: T }>(ownerUserId,
    `SELECT payload FROM career_data_workflow_exports
     WHERE workflow_export_id=$1 AND owner_user_id=$2 AND domain=$3
       AND deleted_at IS NULL AND expires_at>now()`,
    [exportId, ownerUserId, domain],
  );
  return result.rows[0]?.payload;
}

export async function createOpportunitySnapshot<T extends {
  jobId: string; source: string; sourceReference: string; taxonomyVersion: string;
}>(ownerUserId: number, payload: T) {
  await actorQuery(ownerUserId,
    `INSERT INTO career_data_opportunity_snapshots
      (opportunity_snapshot_id,owner_user_id,provider,provider_reference,content_hash,
       normalization_version,payload,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$2)
     ON CONFLICT (owner_user_id,provider,provider_reference,content_hash) DO NOTHING`,
    [payload.jobId, ownerUserId, payload.source, payload.sourceReference,
      contentHash(payload), payload.taxonomyVersion, payload],
  );
  return payload;
}

export async function listOpportunitySnapshots<T>(ownerUserId: number): Promise<T[]> {
  const result = await actorQuery<{ payload: T }>(ownerUserId,
    `SELECT payload FROM career_data_opportunity_snapshots
     WHERE owner_user_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [ownerUserId],
  );
  return result.rows.map((row) => row.payload);
}

export async function getOpportunitySnapshot<T>(ownerUserId: number, snapshotId: string) {
  const result = await actorQuery<{ payload: T }>(ownerUserId,
    `SELECT payload FROM career_data_opportunity_snapshots
     WHERE opportunity_snapshot_id=$1 AND owner_user_id=$2 AND deleted_at IS NULL`,
    [snapshotId, ownerUserId],
  );
  return result.rows[0]?.payload;
}

export async function saveOpportunity(ownerUserId: number, snapshotId: string) {
  const id = `saved_${contentHash(`${ownerUserId}:${snapshotId}`).slice(0, 24)}`;
  await actorQuery(ownerUserId,
    `INSERT INTO career_data_saved_opportunities
      (saved_opportunity_id,owner_user_id,opportunity_snapshot_id,created_by,updated_by)
     VALUES ($1,$2,$3,$2,$2)
     ON CONFLICT (saved_opportunity_id) DO UPDATE SET
       status='saved',deleted_at=NULL,record_version=career_data_saved_opportunities.record_version+1,
       updated_by=$2,updated_at=now()`,
    [id, ownerUserId, snapshotId],
  );
  return id;
}

export async function listSavedOpportunities(ownerUserId: number) {
  const result = await actorQuery<{ opportunity_snapshot_id: string }>(ownerUserId,
    `SELECT opportunity_snapshot_id FROM career_data_saved_opportunities
     WHERE owner_user_id=$1 AND status='saved' AND deleted_at IS NULL ORDER BY updated_at DESC`,
    [ownerUserId],
  );
  return result.rows.map((row) => row.opportunity_snapshot_id);
}

export async function unsaveOpportunity(ownerUserId: number, snapshotId: string, expectedVersion?: number) {
  const values: unknown[] = [ownerUserId, snapshotId];
  const versionClause = expectedVersion === undefined ? "" : " AND record_version=$3";
  if (expectedVersion !== undefined) values.push(expectedVersion);
  const result = await actorQuery(ownerUserId,
    `UPDATE career_data_saved_opportunities
     SET status='removed',deleted_at=now(),record_version=record_version+1,updated_by=$1,updated_at=now()
     WHERE owner_user_id=$1 AND opportunity_snapshot_id=$2 AND deleted_at IS NULL${versionClause}`,
    values,
  );
  if (result.rowCount !== 1) throw coded(expectedVersion === undefined ? "resource_not_found" : "record_version_conflict");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function coded(code: string) {
  return Object.assign(new Error(code), { code });
}
