# Production readiness checklist

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
