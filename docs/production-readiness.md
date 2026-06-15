# Production Readiness Notes

## Secrets

Do not deploy `.env` from the working directory or a zip export. Production secrets must come from a secret manager such as Replit Secrets, AWS SSM, Doppler, or the deployment platform's encrypted environment variables.

The API rejects the example JWT placeholder and requires a `JWT_SECRET` of at least 32 characters. In `NODE_ENV=production`, `DATABASE_URL` must not point at localhost.

Password reset and email verification require a transactional email provider. Set `RESEND_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`, and `API_BASE_URL` from the deployment secret manager. In local development, missing `RESEND_API_KEY` is allowed and the API logs the generated links instead of sending mail.

Google sign-in requires a Google OAuth web client. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and, when the API is not hosted at `API_BASE_URL`, `GOOGLE_REDIRECT_URI`. The default callback is `{API_BASE_URL}/api/auth/google/callback`; register that exact URL in Google Cloud Console as an authorized redirect URI. Local development usually uses `http://localhost:3000/api/auth/google/callback`.

CI rejects production artifacts that contain a literal `.env` file. Deployments should pull environment values from the secret manager, not from a zip export or checked-in file.

Netlify serves the React app and routes `/api/*` to the bundled API function. For a same-domain deploy such as `https://careerpathx.ai`, leave `VITE_API_BASE_URL` unset so browser requests stay on the same origin. Set `APP_BASE_URL`, `API_BASE_URL`, and `FRONTEND_ORIGIN` to the public site URL in Netlify environment variables.

## Observability

Set `SENTRY_DSN` for the API and `VITE_SENTRY_DSN` for the frontend before production launch. Use `SENTRY_ENVIRONMENT` / `VITE_SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` / `VITE_SENTRY_RELEASE`, and the trace sample-rate variables to keep events grouped by release and environment.

The API initializes Sentry during Express setup and forwards terminal errors to Sentry before returning the generic JSON error response. The frontend initializes Sentry from Vite environment variables so browser errors are visible outside local logs.

## Database Migrations

Use versioned Drizzle migrations for production:

```bash
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run migrate
```

Generated migration files are committed under `lib/db/migrations/`. `pnpm --filter @workspace/db run push` is for local development only. Any destructive rename or unit conversion must be captured as explicit SQL with the data backfill decision documented in the migration.

Production deploy order:

1. Install dependencies with the lockfile.
2. Build the production targets.
3. Run `pnpm --filter @workspace/db run migrate` against the production `DATABASE_URL`.
4. Start the API server only after migrations complete successfully.

The migration step should run once per deploy before the new API process accepts traffic. Do not start the API against an unmigrated schema.

## Deployment Build Target

Use:

```bash
pnpm run build:production
```

This builds only the API server and CareerPath frontend. The mockup sandbox is intentionally excluded from production builds.

## Known Scale Limits

The analysis in-progress lock, idempotency cache, and default rate-limit store are currently process memory. Keep the first production deployment single-instance, or move these to Redis before horizontal scaling.

Before running multiple API instances, migrate rate limiting to `rate-limit-redis`, move the idempotency cache to a Redis-backed key/value store with TTLs, and replace the analysis in-progress `Set` with a Redis lock or a sticky-session strategy.

Authenticated requests currently verify `tokenVersion` with a database read. That is acceptable for early traffic, but it can become a hot path under sustained load. Add a short-lived in-process or Redis-backed cache once request volume justifies it.

Transactional email is implemented with Resend. Keep that direct integration until a second provider is needed; at that point, introduce a small `Mailer` interface so provider swaps do not touch auth routes.

The command palette uses a curated action list today. If the route surface grows, move route metadata into a shared table and derive both navigation and command palette entries from that source.

CV imports are bounded by a 5 MB upload cap, a dedicated rate limit, and a 10 second parser timeout. Keep the timeout in place for both PDF and DOCX extraction because parser libraries can behave poorly on malformed files.

## Minimum Test Coverage Still Needed

Vitest and Supertest coverage now exists for the highest-risk API flows. Keep expanding coverage before real user launch:

- Frontend smoke tests for login, profile save, career goal save, and CV import review.
- Migration tests for destructive schema changes and data backfills.
