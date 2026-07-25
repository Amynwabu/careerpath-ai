# Career data persistence and lifecycle

CareerPathX career data uses the existing PostgreSQL and Drizzle stack. The
`career_data_*` tables are separate from the governed taxonomy tables and store
only taxonomy codes and version references. Taxonomy v2026.1 remains
unpublished and cannot be used for live assessments.

## Data model

The migration defines owner-scoped tables for:

- profiles and separately isolated personal contact data;
- source-document metadata;
- typed profile entities covering employment, education, credentials,
  memberships, projects, achievements and skill evidence;
- corrections;
- goals;
- immutable assessments and assessment items;
- immutable plan revisions, actions, milestones, risks and dependencies;
- evidence metadata;
- advisor grants;
- export and deletion requests;
- append-only audit events;
- idempotency records and database-backed rate-limit counters.

Every domain record carries a direct `owner_user_id`; access does not depend
only on a parent join. Mutable records have `record_version`, actor and
timestamps. Lifecycle-managed records include deletion and retention fields.
Personal contact values and credential identifiers are kept outside readiness
and planning tables. Protected characteristics are not collected or inferred.

The generated Drizzle migration is in `lib/db/drizzle`. The additional RLS SQL
enables row-level security on every career-data table. Owner policies use a
transaction-local `app.user_id`. Advisor read policies require an active,
unrevoked, unexpired grant with the necessary scope. Anonymous policies are not
created.

Application queries still include explicit owner predicates. RLS is defense in
depth, not a replacement for server-side authorization.

## Authentication and authorization

All career-profile, planning, persistence and upload routes use the existing
short-lived JWT middleware. In production the server now refuses to start
without `JWT_SECRET`. Cookies remain HTTP-only, secure in production and
SameSite Lax.

The central `CareerDataAuthorizer` supports owner checks and scoped advisor
access. Unauthorized IDs return the same not-found response as nonexistent
records, reducing IDOR information leakage.

Advisor scopes are:

- `profile_read`
- `redacted_profile_read`
- `assessment_read`
- `plan_read`
- `plan_comment`
- `evidence_review`

Grants are user-created, revocable and optionally expiring. A redacted scope
does not imply full-profile access. Employer-confirmed or credential-verified
evidence still requires a future governed verification service.

## Transactions, history and concurrency

Profile creation writes the profile, isolated personal data, typed entities,
idempotency record and safe audit event in one transaction. Assessment and plan
creation likewise commit their child items transactionally.

Assessments are append-only. Reassessment inserts another assessment linked by
`previous_assessment_id`. Plans use a series and revision number; prior
revisions are not overwritten. Mutable profile and action operations require an
expected integer version and atomically increment it. Stale updates return
`record_version_conflict`.

Create-profile, goal, assessment, plan and deletion operations use hashed
idempotency keys and request fingerprints. Raw request bodies and keys are not
stored. Reusing a key with different stable fields fails.

## Upload lifecycle and storage

The authenticated upload policy checks:

- authenticated server identity;
- normalized traversal-safe filename;
- PDF, DOCX, TXT or Markdown content type;
- non-empty content up to 8 MiB;
- configurable stored-document and byte quotas;
- user and defensive IP rate limits;
- explicit retention mode.

The default is `persist_profile_only`. Other modes are `process_only`,
`temporary` and `persist_document`.

`CareerDocumentStorage` abstracts private upload, metadata lookup, short-lived
signed read URLs, existence and deletion. The Supabase implementation derives
object keys from the authenticated user and document ID, requires an HTTPS
provider URL, uses server-only service credentials and caps signed URLs at 15
minutes. Object keys and signed URLs are excluded from public API responses,
logs and database exports. No public bucket is created by this code.

The production upload path requires `scan_status = clean`. The repository
contains a scanner interface and an explicitly unconfigured adapter. Therefore
uploads fail closed with `document_not_clean` until a real scanner adapter is
configured. The test-only policy may allow `unsupported`; production may not.
This implementation does not claim operational malware protection.

Deleting a document removes the storage object before marking metadata deleted.
If storage deletion fails, the API does not report successful deletion.

## Rate limits, quotas and entitlements

Sensitive routes use PostgreSQL-backed per-user and defensive per-IP counters.
Responses use HTTP 429, `rate_limit_exceeded` and `Retry-After`.

Quotas are centralized and configurable through environment-backed providers:
documents, bytes, profiles, active goals, daily assessments, daily plans,
advisor grants and daily exports. The `EntitlementProvider` boundary defines
Standard/Premium capabilities without implementing billing or embedding
membership rules in route handlers.

## Retention and deletion

Central retention classes define duration, expiry action, legal-hold behavior
and audit requirements:

- temporary uploads;
- active and archived profiles;
- source documents;
- generated exports;
- audit events;
- deletion tombstones.

The `career-data:retention` command is bounded and idempotent. It finds expired
documents and exports, expires advisor grants, removes expired idempotency
records and processes scheduled deletion requests. Private objects are deleted
before database metadata. Failed work remains retryable and is reported by safe
resource ID and error category.

Account deletion is requested, scheduled and processed asynchronously. The
worker deletes source objects, documents, exports, grants and profile
hierarchies. Assessment, plan and evidence rows cascade from their owned parent
records. Minimal audit/tombstone retention requires legal approval before
production activation. The system does not claim completion until configured
storage deletion and the database transaction succeed.

There is no user-profile vector index or cross-user semantic retrieval cache.
Deployments adding caches or search must key by owner, invalidate on change and
remove data on deletion.

## Exports and audit

Persistent export requests support JSON, Markdown and ZIP metadata bundles.
Generated exports expire. Object-storage files are excluded unless a separately
authorized secure export workflow is added.

Audit metadata is allow-listed. It may contain record counts, versions,
taxonomy version, status, duration, error category, scope count and format. It
cannot contain CV text, names, contact details, constraints, notes, tokens,
object keys or signed URLs.

## API behavior

Persistent responses return `persistenceStatus: "persistent"` only after the
transaction commits. Collection routes are bounded and profiles use stable
cursor pagination. Unauthorized and missing resources both return 404.

The protected `/career-data` browser route provides saved-profile, assessment
and plan counts, private upload with retention choice and scan state, advisor
sharing, export requests and deletion requests. It displays success only after
the API succeeds.

## Safe health and observability

`GET /api/health/dependencies` reports only `healthy`, `degraded`,
`unavailable` or `not_configured` for database, object storage, scanner,
retention worker, authentication and taxonomy provider. It does not expose
hostnames or credentials.

Operational metrics may include counts, latency, outcome and error category.
They must never include personal values, CV text, credentials, storage keys,
signed URLs or tokens.

## Production configuration checklist

Before production enablement, verify:

- `DATABASE_URL` targets the approved PostgreSQL instance.
- Generated schema migration and manual RLS policies are applied and recorded.
- RLS is exercised with the deployed database role model.
- `JWT_SECRET` is set, rotated and absent from frontend bundles.
- Supabase URL, service-role key and a private bucket are configured server-side.
- Bucket public access is disabled.
- A real malware scanner adapter is configured and tested.
- File-size, user/IP rate limits and quotas are approved.
- Retention durations, grace periods and legal holds have legal approval.
- Export expiry and signed-URL lifetimes are approved.
- Audit retention and deletion tombstone content are approved.
- CORS origins and SameSite/CSRF controls match the deployed topology.
- TLS, provider encryption at rest, backups and restore testing are verified.
- Monitoring alerts cover database, storage, scans, authorization denials,
  retention failures and deletion failures.
- Background retention execution is scheduled with least-privilege credentials.

## Known limitations

- No real malware scanner is configured by this repository.
- Supabase private storage requires deployment secrets and a pre-created private
  bucket; it was not exercised against production.
- RLS SQL is statically tested but not exercised against a configured PostgreSQL
  test database in this workspace.
- Field-level encryption is not implemented; provider encryption at rest is a
  deployment responsibility.
- Backup and restore have not been exercised.
- Retention periods require legal review.
- Billing and membership enforcement are interfaces only.
- Background-worker scheduling and production monitoring are not deployed.
- Evidence-file verification and PDF exports remain unavailable.
- Production readiness must not be claimed until the checklist is completed.
