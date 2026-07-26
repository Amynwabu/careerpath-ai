# Staging smoke tests

`scripts/staging-smoke.mjs` checks private reachability and safe health behaviour.
The deployment workflow runs it only after migration, fixture seeding, deployment,
and access-control confirmation.

The hosted suite must additionally verify authentication/logout, client workflow
resumption, advisor sharing and denials, export authorization, quota replay, job
completion, version conflicts, retention dry run, and deployed migration version.

No hosted smoke suite has run because no isolated private staging deployment is
configured. Localhost results must not be reported as hosted evidence.
