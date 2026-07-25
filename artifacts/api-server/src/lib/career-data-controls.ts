import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { careerDataRateLimitsTable, db } from "@workspace/db";
import {
  SupabasePrivateDocumentStorage,
  HttpMalwareScanner,
  UnconfiguredDocumentStorage,
  UnconfiguredMalwareScanner,
  defaultQuotas,
  type CareerDocumentStorage,
  type MalwareScanner,
  type QuotaProvider,
} from "@workspace/career-data";

export const careerDocumentStorage: CareerDocumentStorage =
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.CAREER_DOCUMENT_BUCKET
    ? new SupabasePrivateDocumentStorage({
        baseUrl: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: process.env.CAREER_DOCUMENT_BUCKET,
      })
    : new UnconfiguredDocumentStorage();

export const malwareScanner: MalwareScanner =
  process.env.CAREER_MALWARE_SCANNER_URL &&
  process.env.CAREER_MALWARE_SCANNER_API_KEY
    ? new HttpMalwareScanner({
        endpoint: process.env.CAREER_MALWARE_SCANNER_URL,
        apiKey: process.env.CAREER_MALWARE_SCANNER_API_KEY,
      })
    : new UnconfiguredMalwareScanner();

export const quotaProvider: QuotaProvider = {
  async get() {
    return {
      ...defaultQuotas,
      storedDocuments: positiveEnv("CAREER_QUOTA_DOCUMENTS", defaultQuotas.storedDocuments),
      storageBytes: positiveEnv("CAREER_QUOTA_STORAGE_BYTES", defaultQuotas.storageBytes),
      profiles: positiveEnv("CAREER_QUOTA_PROFILES", defaultQuotas.profiles),
      assessmentsPerDay: positiveEnv("CAREER_QUOTA_ASSESSMENTS_PER_DAY", defaultQuotas.assessmentsPerDay),
      plansPerDay: positiveEnv("CAREER_QUOTA_PLANS_PER_DAY", defaultQuotas.plansPerDay),
      advisorGrants: positiveEnv("CAREER_QUOTA_ADVISOR_GRANTS", defaultQuotas.advisorGrants),
      exportsPerDay: positiveEnv("CAREER_QUOTA_EXPORTS_PER_DAY", defaultQuotas.exportsPerDay),
    };
  },
};

export async function enforceRateLimits(input: {
  userId: number;
  ip: string;
  endpointClass: string;
  userLimit: number;
  ipLimit: number;
  windowSeconds?: number;
}) {
  const windowSeconds = input.windowSeconds ?? 60;
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000,
  );
  const userCount = await incrementCounter(
    input.userId,
    `${input.endpointClass}:user`,
    windowStart,
  );
  const ipHash = createHash("sha256").update(input.ip).digest("hex").slice(0, 16);
  const ipCount = await incrementCounter(
    input.userId,
    `${input.endpointClass}:ip:${ipHash}`,
    windowStart,
  );
  if (userCount > input.userLimit || ipCount > input.ipLimit) {
    const retryAfterSeconds =
      windowSeconds - Math.floor((Date.now() - windowStart.getTime()) / 1000);
    throw Object.assign(new Error("Rate limit exceeded."), {
      code: "rate_limit_exceeded",
      retryAfterSeconds,
    });
  }
}

async function incrementCounter(
  ownerUserId: number,
  endpointClass: string,
  windowStartedAt: Date,
) {
  const id = `rate_${randomUUID()}`;
  const [row] = await db.insert(careerDataRateLimitsTable).values({
    id,
    ownerUserId,
    endpointClass,
    windowStartedAt,
  }).onConflictDoUpdate({
    target: [
      careerDataRateLimitsTable.ownerUserId,
      careerDataRateLimitsTable.endpointClass,
      careerDataRateLimitsTable.windowStartedAt,
    ],
    set: {
      requestCount: sql`${careerDataRateLimitsTable.requestCount} + 1`,
      updatedAt: new Date(),
    },
  }).returning({ requestCount: careerDataRateLimitsTable.requestCount });
  return row?.requestCount ?? 1;
}

function positiveEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
