# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension ("FlattenJson") that converts nested JSON into the flat, colon-delimited key format used by .NET's `secrets.json` / configuration system (e.g. `{"Parent":{"Child":"val"}}` → `{"Parent:Child":"val"}`). Single command: `flatten-json.flatten`.

## Commands

- `pnpm install` — install dependencies (pnpm is required; see `pnpm-workspace.yaml`)
- `pnpm run compile` — type-check, lint, and bundle via esbuild (runs before tests)
- `pnpm run watch` — parallel watch mode (esbuild + tsc), used during development
- `pnpm run check-types` — `tsc --noEmit` only
- `pnpm run lint` — `eslint src`
- `pnpm test` — compiles tests, compiles the extension, lints, then runs `vscode-test` (launches a real VS Code instance)
- To run a single test, filter with mocha's `-g` via the underlying test runner, or temporarily scope `.vscode-test.mjs`'s `files` glob — there's no separate "run one test" script.

## Architecture

- `src/flatten.ts` — pure logic, no VS Code dependency. `flattenJson(parsed: unknown)` requires a top-level plain object (throws otherwise, matching secrets.json's shape) and recursively walks objects/arrays, joining keys with `:`. Arrays are flattened using their index as a path segment (`Parent:0`). Empty objects/arrays contribute no keys, which leaves index gaps in arrays when an empty container is interleaved with real values — this is intentional, not a bug.
- `src/extension.ts` — VS Code glue. `activate()` registers the `flatten-json.flatten` command. The command flow: prompt via `showQuickPick` for a JSON source (Active Document, Active Selection, Clipboard, or Pick a File...) → read the raw text → `JSON.parse` + `flattenJson` → open the result as a new untitled `json` document. Keep source-reading (`getSourceText`) and flattening (`flatten.ts`) separate; new JSON sources should be added as new cases in `getSourceText`'s switch, not by touching `flatten.ts`.
- Build: esbuild bundles `src/extension.ts` → `dist/extension.js` (CJS, `vscode` external). Tests compile separately via plain `tsc` into `out/` and run against that output, not the esbuild bundle.

## Notes

- `flatten.ts` has no VS Code imports by design — keep it that way so its test suite (`src/test/flatten.test.ts`) can run logic-only assertions without the `vscode-test` Electron harness.
- Leaf value types (string/number/boolean/null) are preserved as-is, not stringified — `extension.ts` only stringifies the whole result once via `JSON.stringify` for display.
- `README.md` is the marketplace listing — it's what users see when deciding whether to install the extension, so it must read as marketing first (features, why it's useful, screenshots/GIFs). Any developer-facing info there should be minimal, kept to the end.
- `CHANGELOG.md` must be updated whenever a new version ships (bump matching `package.json`'s `version`).
