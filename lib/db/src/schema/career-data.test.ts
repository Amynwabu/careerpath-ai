import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  careerDataAdvisorGrantsTable,
  careerDataAssessmentsTable,
  careerDataAuditEventsTable,
  careerDataDocumentsTable,
  careerDataEvidenceTable,
  careerDataGoalsTable,
  careerDataPersonalDataTable,
  careerDataPlanItemsTable,
  careerDataPlansTable,
  careerDataProfilesTable,
} from "./career-data";

describe("career-data relational ownership schema", () => {
  it.each([
    careerDataProfilesTable,
    careerDataPersonalDataTable,
    careerDataDocumentsTable,
    careerDataGoalsTable,
    careerDataAssessmentsTable,
    careerDataPlansTable,
    careerDataPlanItemsTable,
    careerDataEvidenceTable,
    careerDataAdvisorGrantsTable,
    careerDataAuditEventsTable,
  ])("requires direct owner identity on %s", (table) => {
    expect(table.ownerUserId.notNull).toBe(true);
  });

  it("keeps direct personal identifiers isolated from career scoring tables", () => {
    expect(careerDataPersonalDataTable).toHaveProperty("email");
    expect(careerDataPersonalDataTable).toHaveProperty("telephone");
    expect(careerDataAssessmentsTable).not.toHaveProperty("email");
    expect(careerDataAssessmentsTable).not.toHaveProperty("telephone");
    expect(careerDataPlansTable).not.toHaveProperty("postalAddress");
  });

  it("ships deny-by-default RLS and scoped advisor policies", async () => {
    const sql = await readFile(
      resolve(process.cwd(), "drizzle/0001_career_data_rls.sql"),
      "utf8",
    );
    expect(sql).toContain("ALTER TABLE career_data_profiles ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("owner_user_id = career_data_actor_user_id()");
    expect(sql).toContain("grant_record.scopes ? 'redacted_profile_read'");
    expect(sql).toContain("grant_record.revoked_at IS NULL");
    expect(sql).toContain("grant_record.expires_at > now()");
    expect(sql).not.toContain("TO anon");
  });
});
