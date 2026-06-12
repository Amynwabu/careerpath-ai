# CareerPath AI Supabase Instructions

This project uses Supabase Postgres through the backend `DATABASE_URL`.

Follow these rules when working on Supabase-related code:

- Keep database access on the backend. The React app should call `/api/*`; it should not use the Supabase service role key or connect directly to Postgres.
- Store `DATABASE_URL` only in `.env`. Never commit database passwords, service role keys, JWT secrets, or Supabase access tokens.
- Use the pooled Supabase Postgres URI for local app development and include `sslmode=require`.
- Use Drizzle schema files in `lib/db/src/schema` as the source of truth for database shape.
- Push schema changes with the VS Code task `db: push schema to Supabase` only after reviewing the generated changes.
- Auth sessions are stored in backend-set httpOnly cookies. Do not reintroduce `localStorage` bearer tokens in the frontend.
- State-changing API requests must keep CSRF protection via the `careerpath_csrf` cookie and `x-csrf-token` header.
- For production, run behind HTTPS and set `COOKIE_SECURE=true` so auth cookies are `Secure`.

Relevant files:

- API server: `artifacts/api-server/src`
- Frontend: `artifacts/careerpath-ai/src`
- Database schema: `lib/db/src/schema`
- Database client: `lib/db/src/index.ts`
- Local env template: `.env.example`
