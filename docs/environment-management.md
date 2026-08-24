# Environment management

`APP_ENV` is one of `local`, `test`, `staging`, or `production`. Hosted startup
fails when database, signing, origin, storage, namespace, version, or URL
configuration is absent or unsafe. Hosted origins must use HTTPS, wildcard CORS
is forbidden, database TLS cannot be disabled, and export links expire within
one hour.

Secrets belong in encrypted deployment-environment stores. Staging and
production values must be separate. Rotate database, JWT, storage, scanner,
email, monitoring, webhook, and migration credentials by creating a replacement,
deploying consumers, revoking the prior credential, and recording the change.
Never copy production data or credentials into staging.

`.env.staging.example` is a key-name template only. It contains no usable
credentials.

## Database identity inventory

| Variable | Purpose | Environment | Role | Connection mode | TLS | Privilege |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | API request runtime | deployed staging/local runtime | runtime | transaction pooler | `require` or `verify-full`, pinned CA | restricted, RLS enforced |
| `WORKER_DATABASE_URL` | lifecycle/background work | deployed staging worker | worker | transaction pooler | `require` or `verify-full`, pinned CA | restricted, `NOBYPASSRLS` |
| `MIGRATION_DATABASE_URL` | reviewed migration commands only | controlled operator/CI step | migrator | direct or session connection | verified TLS | privileged only for migrations |
| `STAGING_DATABASE_URL` | explicit hosted integration input | staging CI/test process | runtime or restricted test | transaction pooler | `require` or `verify-full`, pinned CA | restricted, RLS enforced |
| `STAGING_WORKER_DATABASE_URL` | explicit worker integration input | staging CI/test process | worker | transaction pooler | `require` or `verify-full`, pinned CA | restricted, `NOBYPASSRLS` |
| `SUPABASE_URL` | server-side provider API base | staging functions | provider endpoint | HTTPS | platform TLS | no database role |
| `SUPABASE_SERVICE_ROLE_KEY` | governed storage/provider operations | staging functions only | provider service role | HTTPS | platform TLS | never normal database access |

Hosted integration flags require `APP_ENV=staging`,
`STAGING_SUPABASE_PROJECT_REF`, and the explicit staging test URL. They never
fall back to `DATABASE_URL` or `MIGRATION_DATABASE_URL`. Readiness validation
runs before test files import or mutate fixtures and rejects owner, administrator,
migration and service identities with the sanitized
`restricted_runtime_required` error.

## Test isolation classes

- Pure/unit suites use the normal Vitest parallel scheduler.
- Read-only provider checks may run independently when they use separate pools.
- Stateful database integration files are automatically serialized whenever a
  hosted integration flag is enabled because they share synthetic tables and a
  singleton pool lifecycle.
- Deliberate concurrency cases inside one integration test use independent pool
  acquisitions, except atomic quota/job tests whose concurrency is the behavior
  under test.
- Migration and fixture-seed commands remain separate controlled operations and
  are never launched by the integration runner.
