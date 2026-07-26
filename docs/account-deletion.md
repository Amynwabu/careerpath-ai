# Account deletion verification

Account deletion must be tested only with a synthetic staging identity. It must
cover profiles, evidence, opportunity/CV/interview records, advisor relationships,
exports, storage, quotas, jobs, idempotency records, and telemetry identifiers.

The existing retention adapter revokes advisor grants and cases, removes document
and export objects, deletes profile data, and records a bounded aggregate result.
Managed verification still requires resumability, partial-failure recovery,
storage confirmation, immediate access denial, tombstone inspection, and legal
review of the minimum retained audit record.

No production deletion is enabled.
