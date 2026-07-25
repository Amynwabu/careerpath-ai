# Interview Intelligence and Evidence-Grounded STAR Coaching

## Architecture

`@workspace/interview-intelligence` converts an existing canonical vacancy, classified vacancy
requirements and Career Profile into a deterministic competency map, role-relevant question plan,
evidence selections, claim-safe STAR structures, practice sessions, coaching feedback and interview
readiness. The tailored CV is presentation context only and never becomes a new evidence source.

No generative model is called. A future wording provider may receive one question, approved evidence
excerpts, the requested framework, claim boundaries, tone and length. It must not receive a full CV,
full profile, contact data, protected characteristics, private notes, tokens or unrelated history.

## Competencies and questions

Every competency retains vacancy-requirement identifiers and existing canonical skill codes.
Preferred requirements remain preferred. Questions are labelled as likely preparation areas or
role-relevant practice questions; they are never represented as questions the employer will ask.

Technical questions distinguish `candidate_experience_answer` from `general_study_answer`.
Situational content is a `scenario_response` and cannot become historical evidence. Candidate questions
are neutral and role-focused when verified employer research is unavailable.

## Evidence and STAR

Evidence selection considers relevance, specificity, source support and reuse. Document-supported,
user-confirmed and self-reported evidence remain distinguishable. Missing evidence returns an explicit
missing selection; the engine does not invent a better example.

STAR, STAR-L and CAR sections reuse the application-intelligence claim validator. New metrics,
leadership inflation, conflicting dates and unsupported factual additions are blocked. Each supported
section retains evidence identifiers internally.

## Scoring and feedback

Answer completeness weights requirement relevance (20%), evidence strength (25%), situation (10%),
task (10%), action specificity (20%), evidenced result (10%) and reflection (5%). Bands are
`practice_ready`, `strong`, `developing`, `weak` and `insufficient_evidence`; they are not pass/fail.

Interview readiness weights priority competency coverage (25%), evidence readiness (25%), STAR
completeness (20%), technical preparation (15%), motivation (10%) and candidate questions (5%).
Blockers are separated into evidence, claim, preparation, user-decision and governance categories.

Feedback covers relevance, clarity, specificity, evidence, ownership, structure, result, reflection,
overclaim risk and missing detail. Follow-ups expose vague ownership or unsupported results.

## Practice, privacy and entitlements

Modelled modes are guided, timed, competency-focused, technical-focused, leadership-focused, full mock
and advisor-led. Completion progress is separate from verified preparation progress.

No audio/video recording, transcription, facial analysis, emotion detection, accent scoring or
personality inference is implemented. Salary, availability, sponsorship, work authorization, sensitive
career history and adjustment needs remain user supplied.

Standard and Premium capability objects are exported. Billing is not implemented. Advisor review fails
closed until a real persistent scoped grant is available.

## API and persistence

Authenticated endpoints cover sessions, analysis, competencies, question plans, evidence, versioned
responses, validation, feedback, practice, readiness, progress, advisor review and owner-bound
structured exports. Creation operations use idempotency keys and updates use `If-Match`.

Storage is currently `process_local`, not production persistence. Production requires normalized
RLS-backed interview entities, audit/retention integration, centralized quotas and real advisor grants.

## Governance and known limitations

Vacancy-specific preparation requires an existing canonical vacancy taxonomy version. The engine cannot
publish taxonomy or change canonical codes. Professional eligibility is never inferred.

Known limitations include durable persistence, live voice/video interviewing, transcription,
commercial interview platforms, employer-specific question datasets, live coding environments,
assessment-centre simulations, real advisor sessions, generative provider configuration, multilingual
preparation, legal review for sensitive questions, billing, scheduling and employer feedback.
