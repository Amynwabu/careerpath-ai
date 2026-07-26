# Storage security

Managed private staging storage has not yet been provisioned.

The application supports private Supabase-compatible object storage, owner-derived
keys, short-lived signed URLs, size/MIME controls, and now validates PDF, DOCX, and
text magic bytes before scanning or persistence.

When no managed scanner is configured, staging may enable
`STAGING_MALWARE_ADAPTER=true`. The deterministic adapter only marks an explicit
`CPX_SYNTHETIC_CLEAN_FIXTURE` payload clean, marks the synthetic EICAR fixture
infected, and fails all other content closed. It is not a production malware
scanner. Production scanning remains a release gate.

Separate private buckets are required for documents, generated exports,
interview/advisor exports, and temporary processing artifacts. Object keys are
server-generated and owner-derived. Uploads are checked for extension, MIME,
signature, size, safe filename, archive/macro policy, and malware-scan state
before trust.

Signed reads are owner-authorized and short-lived; hosted export expiry defaults
to 15 minutes and cannot exceed one hour. Retention jobs remove expired exports,
temporary objects, and orphans with safe audit summaries.

The existing Supabase-compatible adapter fails closed when private storage or
malware scanning is not configured. No public bucket or arbitrary public URL is
authorized.
