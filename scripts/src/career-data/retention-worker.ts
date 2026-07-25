import { eq, isNotNull, isNull, lt, or, and } from "drizzle-orm";
import {
  careerDataAdvisorGrantsTable,
  careerDataDeletionRequestsTable,
  careerDataDocumentsTable,
  careerDataExportsTable,
  careerDataIdempotencyTable,
  careerDataProfilesTable,
  db,
} from "@workspace/db";
import {
  SupabasePrivateDocumentStorage,
  UnconfiguredDocumentStorage,
  runRetentionCleanup,
  type CareerDocumentStorage,
  type RetentionAdapter,
  type RetentionWorkItem,
} from "@workspace/career-data";

export async function runCareerDataRetention(now = new Date().toISOString()) {
  return runRetentionCleanup(databaseRetentionAdapter(storage()), {
    now,
    limit: 500,
  });
}

export function databaseRetentionAdapter(
  documentStorage: CareerDocumentStorage,
): RetentionAdapter {
  return {
    async listExpired(now, limit) {
      const at = new Date(now);
      const perType = Math.max(1, Math.floor(limit / 5));
      const [documents, exports, grants, idempotency, deletions] = await Promise.all([
        db.select({
          id: careerDataDocumentsTable.id,
          expiresAt: careerDataDocumentsTable.expiresAt,
          state: careerDataDocumentsTable.uploadStatus,
        }).from(careerDataDocumentsTable).where(and(
          isNull(careerDataDocumentsTable.deletedAt),
          isNotNull(careerDataDocumentsTable.expiresAt),
          lt(careerDataDocumentsTable.expiresAt, at),
        )).limit(perType),
        db.select({
          id: careerDataExportsTable.id,
          expiresAt: careerDataExportsTable.expiresAt,
          state: careerDataExportsTable.status,
        }).from(careerDataExportsTable).where(and(
          isNull(careerDataExportsTable.deletedAt),
          isNotNull(careerDataExportsTable.expiresAt),
          lt(careerDataExportsTable.expiresAt, at),
        )).limit(perType),
        db.select({
          id: careerDataAdvisorGrantsTable.id,
          expiresAt: careerDataAdvisorGrantsTable.expiresAt,
          state: careerDataAdvisorGrantsTable.status,
        }).from(careerDataAdvisorGrantsTable).where(and(
          eq(careerDataAdvisorGrantsTable.status, "active"),
          isNotNull(careerDataAdvisorGrantsTable.expiresAt),
          lt(careerDataAdvisorGrantsTable.expiresAt, at),
        )).limit(perType),
        db.select({
          id: careerDataIdempotencyTable.id,
          expiresAt: careerDataIdempotencyTable.expiresAt,
          state: careerDataIdempotencyTable.operation,
        }).from(careerDataIdempotencyTable)
          .where(lt(careerDataIdempotencyTable.expiresAt, at))
          .limit(perType),
        db.select({
          id: careerDataDeletionRequestsTable.id,
          expiresAt: careerDataDeletionRequestsTable.scheduledAt,
          state: careerDataDeletionRequestsTable.state,
        }).from(careerDataDeletionRequestsTable).where(and(
          or(
            eq(careerDataDeletionRequestsTable.state, "requested"),
            eq(careerDataDeletionRequestsTable.state, "scheduled"),
            eq(careerDataDeletionRequestsTable.state, "failed"),
          ),
          isNotNull(careerDataDeletionRequestsTable.scheduledAt),
          lt(careerDataDeletionRequestsTable.scheduledAt, at),
        )).limit(perType),
      ]);
      return [
        ...documents.map((item) => workItem("document", item)),
        ...exports.map((item) => workItem("export", item)),
        ...grants.map((item) => workItem("advisor_grant", item)),
        ...idempotency.map((item) => workItem("idempotency", item)),
        ...deletions.map((item) => workItem("deletion_request", item)),
      ];
    },
    async process(item, now) {
      if (item.type === "document") {
        const [row] = await db.select().from(careerDataDocumentsTable)
          .where(eq(careerDataDocumentsTable.id, item.id));
        if (!row || row.deletedAt) return "already_processed";
        if (row.storageObjectKey)
          await documentStorage.delete({
            ownerUserId: row.ownerUserId,
            objectKey: row.storageObjectKey,
          });
        await db.delete(careerDataDocumentsTable)
          .where(eq(careerDataDocumentsTable.id, item.id));
        return "processed";
      }
      if (item.type === "export") {
        const [row] = await db.select().from(careerDataExportsTable)
          .where(eq(careerDataExportsTable.id, item.id));
        if (!row || row.deletedAt) return "already_processed";
        if (row.storageObjectKey)
          await documentStorage.delete({
            ownerUserId: row.ownerUserId,
            objectKey: row.storageObjectKey,
          });
        await db.delete(careerDataExportsTable)
          .where(eq(careerDataExportsTable.id, item.id));
        return "processed";
      }
      if (item.type === "advisor_grant") {
        const rows = await db.update(careerDataAdvisorGrantsTable).set({
          status: "expired",
          updatedAt: new Date(now),
        }).where(and(
          eq(careerDataAdvisorGrantsTable.id, item.id),
          eq(careerDataAdvisorGrantsTable.status, "active"),
        )).returning({ id: careerDataAdvisorGrantsTable.id });
        return rows.length ? "processed" : "already_processed";
      }
      if (item.type === "idempotency") {
        const rows = await db.delete(careerDataIdempotencyTable)
          .where(eq(careerDataIdempotencyTable.id, item.id))
          .returning({ id: careerDataIdempotencyTable.id });
        return rows.length ? "processed" : "already_processed";
      }
      const [request] = await db.select().from(careerDataDeletionRequestsTable)
        .where(eq(careerDataDeletionRequestsTable.id, item.id));
      if (!request || request.state === "completed") return "already_processed";
      const documents = await db.select().from(careerDataDocumentsTable)
        .where(eq(careerDataDocumentsTable.ownerUserId, request.ownerUserId));
      for (const document of documents)
        if (document.storageObjectKey)
          await documentStorage.delete({
            ownerUserId: request.ownerUserId,
            objectKey: document.storageObjectKey,
          });
      await db.transaction(async (tx) => {
        await tx.delete(careerDataDocumentsTable)
          .where(eq(careerDataDocumentsTable.ownerUserId, request.ownerUserId));
        await tx.delete(careerDataExportsTable)
          .where(eq(careerDataExportsTable.ownerUserId, request.ownerUserId));
        await tx.delete(careerDataAdvisorGrantsTable)
          .where(eq(careerDataAdvisorGrantsTable.ownerUserId, request.ownerUserId));
        await tx.delete(careerDataProfilesTable)
          .where(eq(careerDataProfilesTable.ownerUserId, request.ownerUserId));
        await tx.update(careerDataDeletionRequestsTable).set({
          state: "completed",
          completedAt: new Date(now),
          failureCategory: null,
        }).where(eq(careerDataDeletionRequestsTable.id, request.id));
      });
      return "processed";
    },
    async audit() {
      // Domain audit insertion is performed by the API/service role in deployed
      // environments. This command returns only safe aggregate output.
    },
  };
}

function workItem(
  type: RetentionWorkItem["type"],
  item: { id: string; expiresAt: Date | null; state: string },
): RetentionWorkItem {
  return {
    id: item.id,
    type,
    expiresAt: item.expiresAt?.toISOString() ?? new Date(0).toISOString(),
    state: item.state,
  };
}

function storage(): CareerDocumentStorage {
  if (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.CAREER_DOCUMENT_BUCKET
  ) {
    return new SupabasePrivateDocumentStorage({
      baseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.CAREER_DOCUMENT_BUCKET,
    });
  }
  return new UnconfiguredDocumentStorage();
}

if (process.argv[1]?.endsWith("retention-worker.ts")) {
  runCareerDataRetention()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.failures.length ? 1 : 0;
    })
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({
        error: (error as { code?: string }).code ?? "retention_worker_failed",
      })}\n`);
      process.exitCode = 1;
    });
}
