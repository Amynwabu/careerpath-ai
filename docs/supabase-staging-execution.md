# Supabase staging execution record

## Scope

- Milestone: CPX-BUSINESS-006C
- Supabase project reference: `sfpbhwzvspuouondwpdy`
- Environment: staging
- Data classification: synthetic only
- Production use: prohibited

## Owner authorization

An authorized CareerPathX owner explicitly confirmed in the CPX-BUSINESS-006C
task that this project is exclusively designated for staging, is not used by a
production application or integration, contains no production data, and may
receive controlled staging writes only after the mandatory read-only isolation
inspection passes.

The authorization permits reviewed migrations, restricted operational roles,
deterministic synthetic fixtures, private staging storage, hosted verification,
synthetic retention and account-deletion tests, private staging deployment,
monitoring configuration, and an isolated recovery drill where supported.

The authorization does not permit access to production systems or data and does
not permit a production deployment.

## Current isolation gate

Decision: `ISOLATION UNVERIFIED`

Provider metadata currently confirms that the project is active and healthy in
`eu-west-1` and uses PostgreSQL 17. The available management access also reports
that point-in-time recovery is disabled, WAL-G capability is enabled, and no
usable physical-backup inventory was returned.

The ignored `.env.staging` file provides project-aligned Supabase URL,
project-reference, publishable-key, and server-key variables. Its filesystem
permissions were tightened to owner-only access before loading.

The migration connection is distinct, project-aligned, and configured through
the Supabase session pooler. DNS, TCP, CA-backed TLS, PostgreSQL authentication,
and read-only transaction execution were verified against PostgreSQL 17.6.

The runtime connection is configured through the Supabase transaction pooler
and is distinct from the migration connection. DNS, TCP, CA-backed TLS,
PostgreSQL authentication, and read-only transaction execution also passed.
However, the authenticated runtime role can bypass RLS, create roles, and create
databases. It is therefore not the governed restricted application identity and
must not be deployed for normal application traffic.

The Netlify function path previously ran release migrations on every API
request using `DATABASE_URL`. Repository code now removes migrations from
request handling and requires `MIGRATION_DATABASE_URL` in the explicit release
migration command. Hosted application and worker connections now accept only
approved explicit TLS modes and pin the Supabase CA with certificate validation
enabled.

No managed write may occur until the remaining isolation and restricted-role
checks pass.

During environment validation, a live-looking Supabase server key was found in
the uncommitted working copy of `.env.staging.example`. It was removed and
replaced with a placeholder immediately. The committed version did not contain
the server-key pattern, the workspace secret scan passed after correction, and
the affected server key must be rotated before any further staging access.
Rotation of that previously exposed key has not yet been independently verified.

Credential validation also found database connection strings in the tracked
`.env.example` template rather than the ignored `.env.staging` file. The
connection-string values were removed from the tracked template and replaced
with encrypted-secret-store placeholders. The secret scan passed after
redaction. Any database password included in those strings must be rotated
before it is supplied through the ignored staging environment file.

## Managed execution

### Restricted-role continuation (2026-08-12)

The managed provider accepts custom `LOGIN` roles with `NOSUPERUSER`,
`NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`. This was
verified with a transactionally rolled-back capability probe; no probe role was
retained.

Provisioning was not attempted because the staging schema is not ready for a
runtime identity. Read-only inspection found 18 legacy public tables, zero
RLS-enabled tables, and none of the governed `career_data_*` tables required by
the runtime, worker, RLS, and pool-isolation suites. Creating a login and broad
grants against that schema would be unsafe.

Hosted readiness now fails closed unless both the effective runtime and worker
database identities are login-capable, have no administrative or RLS-bypass
attributes, inherit no privileged role, and own no schema or table objects.

Netlify account inspection found the existing `careerpathx.ai` production site
but no positively identified, isolated CareerPathX staging site. Deployment is
therefore blocked independently of the database-schema and isolation blockers.
No Netlify environment values or deployments were changed.

No managed migration, fixture seed, role change, bucket creation, retention
operation, restore operation, application deployment, or hosted verification
has been performed under this milestone.

Production status: `Not deployed to production`
