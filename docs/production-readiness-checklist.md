# Production readiness checklist

## CPX-BUSINESS-006B

- [x] 006A foundation committed separately (`703ca1d`)
- [x] Deterministic, guarded synthetic fixture command
- [x] Fresh local migrate-seed-advisor-workflow sequence
- [x] Real pooled identity-isolation suite (local disposable PostgreSQL)
- [x] Durable PostgreSQL job claim/retry/dead-letter/lease/cancel foundation
- [x] Frontend main chunk reduced below 500 KB
- [x] Current dependency audit has no known findings
- [ ] Separate private managed staging project
- [ ] Hosted migrations and schema counts
- [ ] Hosted RLS and pool-identity execution
- [ ] Managed private storage authorization suite
- [ ] Private hosted smoke and browser suites
- [ ] Managed backups and isolated restore drill
- [ ] Observability dashboards and test alerts
- [ ] Authenticated final-image vulnerability scan
- [ ] Formal production approval

Production status: **Not deployed to production**.

Production is blocked until all items have current evidence:

- [ ] Private staging is deployed with restricted access and synthetic data.
- [ ] Managed staging RLS and connection-reuse isolation pass.
- [ ] Private storage authorization and malware scanning pass.
- [x] Durable rate-limit implementation exists.
- [x] Durable quota and job schemas exist.
- [ ] Worker deployment, retries, dead letters, and scheduling are operational.
- [ ] Managed backups are active and a staging restore drill passes.
- [x] Secret and migration scans are automated.
- [ ] Dependency and container scans pass without unapproved critical findings.
- [x] Hosted environment validation, CORS, cookies, and security headers exist.
- [ ] Staging headers and smoke checks pass on the deployed URL.
- [ ] Monitoring, dashboards, alerting, and incident ownership are active.
- [ ] Account deletion and retention dry runs pass on managed staging.
- [ ] Formal privacy, retention, security, and production migration approvals exist.

Current production state: **Not deployed to production**.
