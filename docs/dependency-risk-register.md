# Dependency risk register

Review date: 2026-07-26.

| Package | Previous version | Severity | Path | Action |
| --- | ---: | --- | --- | --- |
| `esbuild` | 0.27.3 | Low | API build dependency | Upgraded to 0.28.1 |
| `markdown-it` | 14.1.1 | Moderate | Orval/TypeDoc tooling | Overridden to 14.3.0 |
| `@opentelemetry/core` | 2.7.1 | Moderate | Netlify CLI tooling | Overridden to 2.8.0 |
| `@babel/core` | 7.29.0 | Low | Vite React build tooling | Overridden to 7.29.7 |
| `body-parser` | 2.2.2 | Low | Express runtime | Overridden to 2.3.0 |

`pnpm audit --audit-level low` now reports no known vulnerabilities. Overrides must
be reviewed when parent packages adopt patched versions.
