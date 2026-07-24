# CareerPathX

AI-powered career intelligence platform for turning a professional profile and
five-year career target into readiness scores, gap analysis, roadmaps, and
trackable milestones.

## What It Is

CareerPathX is a full-stack TypeScript application. Users create an account,
complete a professional profile, define a target role, and run an analysis that
generates:

- A career readiness score
- Skill and experience gaps
- A phased five-year roadmap
- Auto-generated milestones
- Dashboard summaries and activity history

The production app is hosted at [https://careerpathx.ai](https://careerpathx.ai).

## Stack

- **Monorepo**: pnpm workspaces
- **Runtime**: Node.js 24
- **Language**: TypeScript 5.9
- **Frontend**: React, Vite, Tailwind CSS v4, shadcn/ui, React Query
- **API**: Express 5
- **Database**: PostgreSQL on Supabase, Drizzle ORM
- **Validation**: Zod and drizzle-zod
- **Auth**: 15-minute httpOnly access cookies, rotating 30-day refresh sessions,
  and Google OAuth in production
- **API contract**: OpenAPI with Orval-generated hooks and schemas
- **Build**: Vite for the frontend, esbuild for the API bundle

## Local Setup

### Prerequisites

- Node.js 24
- pnpm
- A PostgreSQL-compatible database URL, usually from Supabase

### Environment

Copy the example environment file and fill in local values:

```sh
cp .env.example .env
```

Keep real secrets in `.env`, Netlify environment variables, or a local secret
file. Do not commit real database passwords, JWT secrets, OAuth secrets, or
Supabase service credentials.

The API server requires:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET` for non-development deployments

The frontend development proxy uses:

- `PORT`
- `BASE_PATH`
- `API_ORIGIN`
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` if direct Supabase
  browser access is enabled

### Install

```sh
pnpm install
```

### Typecheck

```sh
pnpm run typecheck
```

### Build

```sh
pnpm run build
```

### Test

Run all workspace test suites:

```sh
pnpm run test
```

### Run The API Locally

If `.env` contains `DATABASE_URL`, start the API from the workspace root:

```sh
pnpm run dev:api
```

The API listens on `http://127.0.0.1:8080` by default.

If you keep the database URL in a separate local secret file, use:

```sh
DATABASE_URL_FILE=/path/to/database-url pnpm run dev:api:secret
```

When `DATABASE_URL_FILE` is not set, the loader reads from
`/private/tmp/careerpath-ai-database-url`.

### Run The Frontend Locally

In a second terminal, point the frontend at the local API:

```sh
PORT=21588 BASE_PATH=/ API_ORIGIN=http://127.0.0.1:8080 pnpm --filter @workspace/careerpath-ai run dev
```

To run the local frontend against the hosted Netlify API instead:

```sh
PORT=21588 BASE_PATH=/ API_ORIGIN=https://careerpathx.ai pnpm --filter @workspace/careerpath-ai run dev
```

The frontend will proxy `/api/*` requests to `API_ORIGIN`.

### Database Schema

Drizzle schema lives in `lib/db/src/schema`. Push schema changes to a development
database with:

```sh
pnpm --filter @workspace/db run push
```

Use this only against the intended database. For production, prefer reviewed
migrations and deployment-time environment variables.

The CareerPathX taxonomy foundation is documented in
[docs/career-taxonomy-schema.md](docs/career-taxonomy-schema.md). After applying
release migrations to a safe development database, verify the taxonomy schema
with:

```sh
DATABASE_URL=postgres://... pnpm --filter @workspace/scripts run verify:career-taxonomy
```

The governed source-ingestion pipeline for UK SOC, ESCO, O\*NET, and controlled
professional-body inputs is documented in
[docs/taxonomy-ingestion-pipeline.md](docs/taxonomy-ingestion-pipeline.md).
Inspect authorised local source files with:

```sh
pnpm taxonomy:source:inspect --source=all
```

### API Codegen

Regenerate API hooks and Zod schemas from the OpenAPI spec with:

```sh
pnpm --filter @workspace/api-spec run codegen
```

Generated client code is written under `lib/api-client-react` and
`lib/api-zod`.

## Architecture Overview

```text
Browser
  |
  | React/Vite app
  v
artifacts/careerpath-ai
  |
  | /api proxy in local dev, same-origin /api in production
  v
artifacts/api-server
  |
  | Drizzle ORM
  v
Supabase PostgreSQL
```

### Monorepo Map

- `artifacts/careerpath-ai`: React and Vite frontend
- `artifacts/api-server`: Express API server
- `lib/db`: Drizzle schema and database configuration
- `lib/api-spec`: OpenAPI specification and Orval config
- `lib/api-client-react`: generated React Query API hooks
- `lib/api-zod`: generated Zod API schemas
- `scripts`: workspace helper scripts
- `supabase`: Supabase configuration and SQL migrations

### Main Frontend Routes

- `/login` and `/register`
- `/onboarding`
- `/dashboard`
- `/profile`
- `/career-goal`
- `/analysis`
- `/roadmap`
- `/milestones`
- `/history`

### Main API Areas

Protected browser routes use same-origin httpOnly cookies. The API rotates the
refresh token after an expired access session; tokens are never stored in
browser JavaScript storage.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/onboarding/status`
- `POST /api/onboarding/intake`
- `GET/PATCH /api/profile`
- Work experience, education, skills, and certifications CRUD routes
- `GET/PUT /api/career-goal`
- `POST /api/analysis`
- `GET /api/analysis/latest`
- `GET /api/analysis/history`
- `GET /api/roadmap`
- `GET/PATCH /api/milestones`
- Dashboard summary, skill gap, and activity routes

## Deployment Notes

Production is hosted on Netlify at
[https://careerpathx.ai](https://careerpathx.ai). The frontend and API are
served from the same domain, so production API calls should use same-origin
`/api/*` requests.

Production environment variables are managed in Netlify, not in the repository.
At minimum, production needs:

- `DATABASE_URL`
- `API_BASE_URL` or equivalent app origin value set to `https://careerpathx.ai`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

For Google OAuth, the Google Cloud OAuth web client must include this redirect
URI:

```text
https://careerpathx.ai/api/auth/google/callback
```

Supabase stores the production PostgreSQL data. Keep schema changes reviewed and
avoid pushing local experiments to the production database.

Release migrations are applied by the Netlify API function from
`supabase/migrations` and recorded in `careerpath_schema_migrations`.

## Documentation

`README.md` is the primary project documentation. `replit.md` is retained only
for Replit-specific notes.

Security reports should follow [SECURITY.md](SECURITY.md).
