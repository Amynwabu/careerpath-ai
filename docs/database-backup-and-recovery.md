# Database backup and recovery

Managed staging and production require encrypted automated backups and
point-in-time recovery where the provider supports it. Proposed targets pending
provider approval are a 24-hour RPO and four-hour RTO, with daily backups kept
for at least 14 days and monthly restore drills.

A restore drill must create an isolated target, restore the selected snapshot,
verify migration and row-count invariants, run RLS and application smoke tests,
record timings, and remove the target. A configured backup is not considered
operational until this drill passes.

No managed backup or restore drill was executed by this implementation because
no private staging provider or approved staging data target was supplied.
