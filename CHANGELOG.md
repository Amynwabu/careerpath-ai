# Changelog

All notable project changes should be documented in this file.

## [Unreleased]

### Added

- Expanded repository documentation in `README.md`.
- Added MIT license text in `LICENSE`.
- Added contributor setup and pull request guidance in `CONTRIBUTING.md`.
- Added this changelog for future release notes.

### Changed

- Trimmed `replit.md` to Replit-specific notes so `README.md` is the primary
  documentation source.
- Updated ignore rules for editor folders and TypeScript build info files.
- Sanitized `.env.example` so it does not contain real credentials.

## [0.1.0] - 2026-06-17

### Added

- Initial MVP structure for the CareerPathX monorepo.
- React and Vite frontend for profile, career goal, analysis, roadmap,
  milestone, dashboard, and history workflows.
- Express API server with authentication, profile, analysis, roadmap,
  milestone, and dashboard routes.
- Drizzle schema for PostgreSQL on Supabase.
