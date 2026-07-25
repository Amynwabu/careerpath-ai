# Opportunity Intelligence Engine

## Architecture

`@workspace/opportunity-intelligence` is a UI-independent deterministic engine. It accepts vacancy
records, a published CareerPathX taxonomy snapshot, the existing occupation and skill resolver, and an
existing structured Career Profile. It never writes taxonomy records and never invokes an LLM.

The flow is:

1. validate required fields, dates, URLs, salary ranges and source-reference uniqueness;
2. normalize title, location, working arrangement, employment type, seniority and annual salary;
3. resolve occupation and skills through the existing published-taxonomy resolver;
4. preserve unresolved terms without treating them as matches;
5. calculate evidence-based component scores;
6. create evidence-linked strengths, gaps and actions;
7. rank deterministically by match score and posting freshness;
8. expose owner-scoped results through authenticated APIs and a protected browser workspace.

The current API store is intentionally `process_local`. It proves the API and privacy boundaries but is
not a durable vacancy or match store. Production activation requires governed database migrations,
retention policy, backup/restore testing and owner/advisor row-level access controls.

## Matching model

Default weights total 100%:

| Component | Weight |
| --- | ---: |
| Published canonical skills | 40% |
| Evidenced experience | 25% |
| Qualifications | 10% |
| Certifications | 5% |
| Location/working preference | 10% |
| Salary preference | 5% |
| Confirmed career goal | 5% |

Weights are configurable but must be non-negative and total exactly 100%. Scores are integers from
0–100. Bands are: Perfect 95–100, Excellent 85–94, Strong 70–84, Moderate 55–69, Weak 40–54 and Poor
below 40. Bands explain evidence alignment and are not hiring predictions.

Career-goal scoring uses only an explicitly confirmed destination occupation code. It does not infer a
generic management or technology destination from a title. This keeps profession-specific progression
choices outside job matching and prevents silent cross-profession bias.

## Vacancy ingestion and normalization

The canonical source enum supports manual upload, employer portal, CSV, JSON, XML and REST API
connectors. This implementation provides the canonical connector contract and authenticated import API.
Provider-specific adapters remain extension points. LinkedIn, Indeed, Reed, TotalJobs, CV Library,
GreenJobs and government feeds must use documented provider APIs; website scraping is prohibited.

Salary conversion uses supplied hourly, daily, weekly or monthly figures and fixed arithmetic to
produce annual values. It does not estimate an absent salary. Location matching supports exact text,
remote and hybrid preference. Driving distance, public-transport estimates and geocoding require a
privacy-reviewed provider and are not fabricated.

## Explanation and privacy

Every result includes component scores, matching evidence, missing required/preferred skills,
qualification/certification gaps, unresolved evidence and an actionable next step. Raw CV content,
protected characteristics, home address and private advisor notes are not returned by opportunity
endpoints. The UI displays only evidence already present in the structured profile match result.

Logging and errors must use stable error categories. API responses sanitize internal exceptions.

## Membership

The package exports explicit Standard and Premium entitlement objects:

- `canViewMatches`
- `canViewTop10Jobs`
- `canViewUnlimitedJobs`
- `canCompareJobs`
- `canExportMatches`
- `canAdvisorReview`

The API demonstrates entitlement enforcement through the request context. Billing and production
membership activation are intentionally not implemented.

## APIs

All endpoints require authentication:

- `POST /api/jobs/import`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs/search`
- `POST /api/job-matches`
- `GET /api/job-matches`
- `POST /api/job-matches/compare`
- `POST /api/employability-score`
- `POST /api/jobs/explain`

The OpenAPI contract documents request bodies, filters, responses, taxonomy-unavailable behavior and
membership restrictions.

## Governance

Normalization calls the existing published CareerPathX occupation and skills resolver. A missing or
candidate taxonomy causes a fail-closed response. Unknown occupations are rejected. Unknown skill terms
remain unresolved and score zero; they are never promoted into canonical taxonomy data.

No taxonomy publishing command or production service is called by this implementation.

## Known limitations

- live job-provider adapters and credentials;
- durable vacancy, saved-job, match, advisor-comment and placement persistence;
- employer portal user experience;
- driving-distance, transport-time and radius providers;
- external salary datasets and labour-market analytics;
- Premium entitlement activation and billing;
- job alerts and notifications;
- durable advisor action approval and placement tracking;
- security-clearance verification and visa-sponsorship verification.
