# Deployment architecture

CareerPathX uses four isolated environments: local, test, staging, and
production. The intended hosted model is a static browser application, a
backend-only API, managed PostgreSQL, private object storage, and durable
database-backed jobs, quotas, and rate limits.

The browser never receives database-owner, migration, storage service-role, or
JWT signing credentials. Requests flow through CareerPathX authentication to a
restricted backend role. Each owner-bound transaction sets `app.user_id`
transaction-locally before repository authorization and RLS evaluation.

Staging must use its own site, database, storage bucket, signing keys, telemetry,
rate-limit namespace, exports, and synthetic identities. The staging workflow is
manual and refuses to run unless access control is explicitly confirmed.
Production deployment remains a separate, manually approved process and is not
implemented as an automatic CI event.
