# Contributing

## Setup

Use Node.js 24 and pnpm.

```sh
pnpm install
cp .env.example .env
pnpm run typecheck
```

Fill `.env` with local values before running the API. Do not commit real
secrets.

## Development

Start the API:

```sh
pnpm run dev:api
```

Start the frontend in another terminal:

```sh
PORT=21588 BASE_PATH=/ API_ORIGIN=http://127.0.0.1:8080 pnpm --filter @workspace/careerpath-ai run dev
```

Run a production-style build before opening a pull request:

```sh
pnpm run build
```

## Pull Requests

- Keep changes focused and explain the user-facing impact.
- Update docs when setup, environment variables, routes, or deployment behavior
  change.
- Add or update tests when changing auth, profile persistence, analysis,
  roadmap, or milestone behavior.
- Do not commit `.env`, database URLs with passwords, OAuth secrets, generated
  local caches, or editor-specific configuration.

## Branches

Use short branch names that describe the change, for example:

- `feature/roadmap-milestones`
- `fix/google-oauth-callback`
- `docs/readme-setup`
