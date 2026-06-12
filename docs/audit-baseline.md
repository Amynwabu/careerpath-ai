# Dependency Audit Baseline

Generated: 2026-05-31

Command:

```sh
pnpm audit --audit-level moderate
```

CI runs the same command through `pnpm run audit:ci` on every pull request and push to `main` or `master`. The baseline is intentionally strict: any moderate, high, or critical advisory should fail CI until it is upgraded, patched, or explicitly documented with a time-bound exception.
