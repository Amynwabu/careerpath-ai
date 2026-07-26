# Interview intelligence persistence

Interview sessions, competency and question resources, evidence selections,
STAR/STAR-L/CAR response versions, practice sessions, readiness results, and
exports are durable. `@workspace/interview-intelligence` remains authoritative
for mapping, question provenance, claim checks, coaching, and readiness.

Responses and deterministic resources are immutable. Editing creates a
superseding response resource; completion progress and verified preparation
remain distinct in the engine result. Repository writes retain the exact source
question/evidence references and do not introduce voice, video, emotion,
biometric, accent, or inferred eligibility analysis.

Owner isolation is enforced in repository predicates and RLS. Advisor review is
read/comment workflow state only and cannot rewrite competencies, questions,
responses, claim status, or readiness scores.

Known limitations: no recording, transcription, coding assessment,
assessment-centre simulation, calendar, or notification integration is included.
