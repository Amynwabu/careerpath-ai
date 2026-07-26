import { pool } from "@workspace/db";

const fixtureUsers = [
  [91001, "Synthetic Standard Client", "standard-client@staging.invalid", "user"],
  [91002, "Synthetic Premium Client", "premium-client@staging.invalid", "premium"],
  [91007, "Synthetic Second Client", "second-client@staging.invalid", "user"],
  [91003, "Synthetic Verified Advisor", "verified-advisor@staging.invalid", "coach"],
  [91004, "Synthetic Wrong Advisor", "wrong-advisor@staging.invalid", "coach"],
  [91005, "Synthetic Suspended Advisor", "suspended-advisor@staging.invalid", "coach"],
  [91006, "Synthetic Admin Verifier", "admin-verifier@staging.invalid", "admin"],
] as const;

export async function seedStagingVerificationFixtures() {
  assertStagingTarget();
  const passwordHash = process.env.STAGING_FIXTURE_PASSWORD_HASH ?? "synthetic-fixture-no-login";
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const [id, name, email, role] of fixtureUsers) {
      await client.query(
        `insert into users (id,name,email,email_verified,password_hash,role)
         values ($1,$2,$3,true,$4,$5)
         on conflict (id) do update set
           name=excluded.name,email=excluded.email,email_verified=true,
           password_hash=excluded.password_hash,role=excluded.role,updated_at=now()
         where users.email like '%@staging.invalid'`,
        [id, name, email, passwordHash, role],
      );
    }
    await client.query(
      `insert into career_data_advisor_profiles
       (advisor_profile_id,advisor_user_id,display_name,professional_title,
        verification_status,account_status,capacity_status)
       values
       ('advisor_profile_verified',91003,'Synthetic Verified Advisor','Staging fixture',
        'verified','active','accepting_new_clients'),
       ('advisor_profile_wrong',91004,'Synthetic Wrong Advisor','Staging fixture',
        'verified','active','accepting_new_clients'),
       ('advisor_profile_suspended',91005,'Synthetic Suspended Advisor','Staging fixture',
        'verified','suspended','not_accepting_new_clients')
       on conflict (advisor_profile_id) do update set
         verification_status=excluded.verification_status,
         account_status=excluded.account_status,
         capacity_status=excluded.capacity_status,
         updated_at=now(),record_version=career_data_advisor_profiles.record_version+1`,
    );
    await client.query(
      `insert into career_data_advisor_grants
       (id,owner_user_id,created_by,updated_by,retention_class,advisor_user_id,
        scopes,status,granted_at,expires_at,revoked_at)
       values
       ('grant_active',91001,91001,91001,'staging_fixture',91003,
        '["profile_read","redacted_profile_read","assessment_read","plan_read","plan_comment",
          "plan_action_review","opportunity_read","job_match_read","cv_analysis_read",
          "cv_draft_read","cv_review","interview_plan_read","interview_response_read",
          "interview_review","evidence_read","evidence_review","session_summary_read",
          "case_manage","outcome_record"]','active',
        '2026-01-01T00:00:00Z','2030-01-01T00:00:00Z',null),
       ('grant_expired',91001,91001,91001,'staging_fixture',91003,
        '["case_manage","cv_review"]','active',
        '2025-01-01T00:00:00Z','2025-02-01T00:00:00Z',null),
       ('grant_revoked',91001,91001,91001,'staging_fixture',91003,
        '["case_manage","cv_review"]','revoked',
        '2026-01-01T00:00:00Z','2030-01-01T00:00:00Z','2026-02-01T00:00:00Z'),
       ('grant_scope_missing',91001,91001,91001,'staging_fixture',91003,
        '["profile_read"]','active',
        '2026-01-01T00:00:00Z','2030-01-01T00:00:00Z',null),
       ('grant_suspended_advisor',91001,91001,91001,'staging_fixture',91005,
        '["case_manage","cv_review"]','active',
        '2026-01-01T00:00:00Z','2030-01-01T00:00:00Z',null)
       on conflict (id) do update set
         scopes=excluded.scopes,status=excluded.status,expires_at=excluded.expires_at,
         revoked_at=excluded.revoked_at,updated_at=now(),
         record_version=career_data_advisor_grants.record_version+1`,
    );
    await client.query(
      `insert into career_data_advisor_cases
       (case_id,owner_user_id,created_by,updated_by,retention_class,advisor_user_id,
        advisor_profile_id,advisor_grant_id,service_type,case_status,case_stage,
        priority,opened_at,closed_at)
       values
       ('case_active',91001,91001,91001,'staging_fixture',91003,
        'advisor_profile_verified','grant_active','fixture_support','active','profile_review',
        'standard','2026-01-01T00:00:00Z',null),
       ('case_scope_missing',91001,91001,91001,'staging_fixture',91003,
        'advisor_profile_verified','grant_scope_missing','fixture_support','active','profile_review',
        'standard','2026-01-01T00:00:00Z',null),
       ('case_closed',91001,91001,91001,'staging_fixture',91003,
        'advisor_profile_verified','grant_active','fixture_support','closed','follow_up',
        'standard','2026-01-01T00:00:00Z','2026-02-01T00:00:00Z')
       on conflict (case_id) do update set
         advisor_grant_id=excluded.advisor_grant_id,case_status=excluded.case_status,
         case_stage=excluded.case_stage,closed_at=excluded.closed_at,updated_at=now(),
         record_version=career_data_advisor_cases.record_version+1`,
    );
    await client.query(
      `insert into career_data_profiles
       (id,owner_user_id,created_by,updated_by,retention_class,profile_version,status,
        summary,completeness,confidence,validation_status,source_document_ids,active)
       values ('career_profile_fixture',91001,91001,91001,'staging_fixture','fixture-v1',
        'active','Synthetic staging profile','{}','{}','fixture_verified','[]',true),
       ('career_profile_second_fixture',91007,91007,91007,'staging_fixture','fixture-v1',
        'active','Synthetic second staging profile','{}','{}','fixture_verified','[]',true)
       on conflict (id) do update set
         summary=excluded.summary,updated_at=now(),
         record_version=career_data_profiles.record_version+1`,
    );
    await client.query(
      `insert into career_data_evidence
       (id,owner_user_id,created_by,updated_by,retention_class,profile_id,evidence_type,
        title,description,verification_status,linked_skill_codes)
       values ('evidence_fixture',91001,91001,91001,'staging_fixture',
        'career_profile_fixture','document','Synthetic evidence',
        'Synthetic staging evidence only','unverified','[]')
       on conflict (id) do update set
         description=excluded.description,updated_at=now(),
         record_version=career_data_evidence.record_version+1`,
    );
    await client.query(
      `insert into career_data_advisor_case_resources
       (case_resource_id,case_id,owner_user_id,resource_type,resource_id,required_scope,created_by)
       values
       ('fixture_profile_link','case_active',91001,'career_profile',
        'career_profile_fixture','profile_read',91001),
       ('fixture_evidence_link','case_active',91001,'evidence_record',
        'evidence_fixture','evidence_review',91001)
       on conflict (case_resource_id) do update set
         revoked_at=null,required_scope=excluded.required_scope`,
    );
    await client.query("commit");
    return {
      users: fixtureUsers.length, advisorProfiles: 3, grants: 5, cases: 3,
      governedResources: 3,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function assertStagingTarget() {
  if (process.env.APP_ENV !== "staging" && process.env.APP_ENV !== "test")
    throw new Error("staging_fixture_environment_required");
  if (process.env.STAGING_FIXTURE_CONFIRMATION !== "SYNTHETIC_ONLY")
    throw new Error("staging_fixture_confirmation_required");
  if (process.env.APP_ENV === "staging" &&
      !process.env.STAGING_FIXTURE_PASSWORD_HASH?.startsWith("$2"))
    throw new Error("staging_fixture_password_hash_required");
  const url = new URL(process.env.DATABASE_URL ?? "");
  const allowedHosts = (process.env.STAGING_DATABASE_HOST_ALLOWLIST ?? "")
    .split(",").map((host) => host.trim()).filter(Boolean);
  if (!allowedHosts.includes(url.hostname)) throw new Error("staging_database_host_not_allowlisted");
  if (process.env.PRODUCTION_DATABASE_HOST && url.hostname === process.env.PRODUCTION_DATABASE_HOST)
    throw new Error("production_database_forbidden");
}

if (process.argv[1]?.endsWith("seed-verification.ts")) {
  seedStagingVerificationFixtures()
    .then((result) => process.stdout.write(`${JSON.stringify({ synthetic: true, ...result })}\n`))
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ error: (error as Error).message })}\n`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
