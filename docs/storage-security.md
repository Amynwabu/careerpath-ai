# Storage security

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
