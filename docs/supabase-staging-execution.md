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

The migration connection is now distinct, project-aligned, configured through
the Supabase session pooler, and its hostname resolves. The runtime connection
uses a distinct username and hostname but remains a direct connection rather
than a transaction-pooler connection, and its hostname does not resolve.
Neither URL explicitly requires TLS.

No SQL authentication or read-only database inventory was attempted after this
validation because the TLS, runtime mode, runtime DNS, and credential-rotation
gates remain unresolved. No managed write may occur until all read-only checks
pass.

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

No managed migration, fixture seed, role change, bucket creation, retention
operation, restore operation, application deployment, or hosted verification
has been performed under this milestone.

Production status: `Not deployed to production`
