# Private staging deployment

## Classification

- Environment: `staging`
- Data: deterministic synthetic fixtures only
- Production data and credentials: prohibited
- Indexing: disabled by `robots.txt` and `X-Robots-Tag`
- Access: deployment is blocked unless the hosting environment confirms private access

The repository does not currently contain an authenticated, isolated managed-staging
project reference. No managed staging deployment has been executed.

## Required provider configuration

Provision independent staging database, pool, storage, signing keys, callback URLs,
telemetry environment, rate-limit namespace, quota records, job worker credential,
export namespace, and hosting site. None may share mutable production infrastructure.

The runtime uses `DATABASE_URL` through `careerpath_app`; workers use
`WORKER_DATABASE_URL` through a restricted worker role; migrations use
`MIGRATION_DATABASE_URL` through `careerpath_migrator`.

Run `.github/workflows/deploy-staging.yml` only after the protected `staging`
environment contains isolated secrets and `STAGING_ACCESS_CONTROL_CONFIRMED=true`.
Production remains a separate, manually approved action.
