# Retention operations

The retention worker defaults to dry-run and limits a batch to 1,000 records.
Executed deletion requires `RETENTION_DRY_RUN=false` and a staging worker credential.

Staging verification must seed expired and non-expired synthetic records, record the
dry-run candidates, execute one bounded batch, rerun idempotently, and verify storage
deletion, database deletion/anonymisation, advisor revocation, exceptions, failures,
and safe aggregate audit output.

The scheduled staging workflow remains dry-run only. Production execution is blocked
pending managed staging evidence and legal retention approval.
