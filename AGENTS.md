# Repository Guidelines

## Project Structure
TypeScript source lives in `src/`. User-loadable commands live in `src/modules/`, shared helpers in `src/helpers.ts`, and shared types in `src/types/`.

Generated output lands in `lib/`; do not edit it directly. Grammar changes start in `grammar.peg` and are regenerated into `src/grammar.js` and `lib/grammar.js` by the build.

Tests live in `tests/`. Documentation and walkthroughs live in `docs/`; update them when changing user-facing behavior.

## Commands
- `npm run build` regenerates the PEG parser and compiles TypeScript.
- `npm run test` runs the Vitest suite.
- `npm run format` formats TypeScript sources and tests; run it after code changes.
- `npm run test:watch` and `npm run test:ui` are available for iteration and debugging.

Some Vitest suites, especially HTTP module tests, may need elevated permissions to bind to localhost. Rerun `npm run test` with elevation when necessary.

## Coding Notes
Use the existing TypeScript patterns and keep strict typing intact. Modules loaded via `pipeline.use` should export object literals keyed by the command names users type.

Write new tests in `tests/` with the `*.test.ts` suffix. Prefer pipeline-level tests for grammar or user-facing command behavior.

Underscore and Moment have been removed. Prefer helpers in `src/utils/` and the custom date formatter for new code.
