# Career profile intelligence pipeline

The `@workspace/career-profile` package converts an uploaded CV or structured
career input into a deterministic, versioned `CareerProfile`. It is independent
of the web UI and does not use an LLM to choose occupations, skills, aliases, or
transition routes.

## Supported inputs

- PDF with embedded text. A scanned PDF with no embedded text returns
  `ocr_required`; OCR is not silently attempted.
- DOCX paragraphs and tables through Mammoth.
- UTF-8 TXT and Markdown.
- Structured job title, summary, employment, education, certifications,
  projects, skills, and career preference fields supplied to the profile
  builder.

PDF and DOCX extraction are covered by parser fixtures. All career-content test
data is synthetic. Legacy `.doc`, macro-enabled Office files, password-protected
PDFs, empty files, mismatched MIME types, invalid signatures, unsafe filenames,
binary text, corrupt documents, and files over 8 MiB are rejected.

External links and script-like text are treated only as inert document text.
The pipeline never fetches URLs or executes uploaded content. Processing logs
contain document identifiers, format, byte size, duration and result counts;
they exclude extracted text and personal data.

## Processing model

1. Validate filename, extension, MIME type, signature, size, encryption, and
   parseability.
2. Extract and normalize text while retaining the original text in the
   process-scoped result.
3. Create offset-addressable blocks and detect known CV sections.
4. Extract employment, education, credentials, projects, achievements, raw
   skill evidence, occupation evidence, dates, and personal data.
5. Attach field-level source references, extractor identity, confidence,
   completeness, warnings, and explicit uncertainty.
6. Validate profile identity, confidence bounds, provenance links and date
   consistency.
7. Optionally redact PII, employers, client names and credential identifiers.
8. Optionally resolve evidence through the existing Career Intelligence Engine.

Extraction and profile construction remain available while taxonomy v2026.1 is
an `unpublished_candidate`. Canonical resolution calls the existing engine and
therefore fail closed until a genuinely published taxonomy snapshot exists.
Unresolved evidence remains raw evidence; it is never replaced by a generic or
technology-biased fallback.

## Retention and persistence

Document parsing and validation remain non-persistent transformations. Profile
construction now commits an authenticated, owner-scoped profile when supplied
with an idempotency key and returns `persistenceStatus: "persistent"` only
after the transaction completes. Persistent profile retrieval uses
`/api/profiles`. Source-document retention uses `process_only`, `temporary`,
`persist_document` or `persist_profile_only`, with the latter as the upload
default.

The API accepts base64 document data:

- `POST /profile/documents/parse`
- `POST /profile/build`
- `POST /profile/validate`
- `POST /profile/redact`
- `POST /profile/resolve`
- `POST /profile/corrections`

Correction records require the correcting actor, timestamp, reason, original
value, corrected value and privacy marker. Only allow-listed employment fields
can be changed. The original profile object is not mutated.

## Operational boundaries

- This package does not publish or alter taxonomy data.
- It does not write to the CareerPathX database.
- It does not infer professional permission, accreditation or human approval.
- It does not provide OCR, virus scanning, archive-bomb inspection, durable
  uploads, profile persistence, or a browser upload UI.
- Production upload infrastructure should add malware scanning, rate limiting,
  authenticated storage policy and deletion enforcement before enabling durable
  retention.
