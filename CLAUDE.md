# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension ("FlattenJson") that converts nested JSON into flat, delimited-key format (e.g. `{"Parent":{"Child":"val"}}` → `{"Parent:Child":"val"}`), matching formats like .NET's `secrets.json`/`IConfiguration` or `__`-delimited environment-variable overrides. The separator is chosen from a picker (`:`, `.`, `__`, `/`, `_`, `-`), defaults to `:`, and remembers the last choice. Single command: `flatten-json.flatten`.

## Commands

- `pnpm install` — install dependencies (pnpm is required; see `pnpm-workspace.yaml`)
- `pnpm run compile` — type-check, lint, and bundle via esbuild (runs before tests)
- `pnpm run watch` — parallel watch mode (esbuild + tsc), used during development
- `pnpm run check-types` — `tsc --noEmit` only
- `pnpm run lint` — `eslint src`
- `pnpm test` — compiles tests, compiles the extension, lints, then runs `vscode-test` (launches a real VS Code instance)
- To run a single test, filter with mocha's `-g` via the underlying test runner, or temporarily scope `.vscode-test.mjs`'s `files` glob — there's no separate "run one test" script.
- `pnpm run package` — `vsce package`, produces a `.vsix` in the repo root (runs `vscode:prepublish`, a production esbuild bundle, first)
- `pnpm run publish` — `vsce publish`; requires a `VSCE_PAT` env var (Marketplace PAT) rather than `vsce login` (see Notes)

## Architecture

- `src/flatten.ts` — pure logic, no VS Code dependency.
  - `parseJson(rawText)` parses via `jsonc-parser`'s `parse` with `allowTrailingComma: true`, so comments and trailing commas (both common in .NET config / VS Code JSON) are tolerated. It accepts a candidate only when the parser reports zero errors, trying the raw text first and then wrapped in `{ }` (a selection often copies just an object's body without its braces); if neither parses cleanly it falls back to `JSON.parse(rawText)` to rethrow a precise strict-parse error.
  - `flattenJson(parsed, separator = ':', prefix = [])` requires a top-level plain object (throws otherwise, matching secrets.json's shape) and recursively walks objects/arrays, joining keys with `separator`. `prefix` (a `(string|number)[]`) re-homes every key under an absolute path — used for the Active Selection "absolute path" mode; empty prefix means keys are relative to the parsed value. Arrays are flattened using their index as a path segment (`Parent:0`). Empty objects/arrays contribute no keys, which leaves index gaps in arrays when an empty container is interleaved with real values — this is intentional, not a bug. Two distinct paths that flatten to the same key throw instead of silently overwriting each other.
- `src/extension.ts` — VS Code glue. `activate()` registers the `flatten-json.flatten` command. The command flow: prompt via `showQuickPick` for a JSON source (Active Document, Active Selection, Clipboard, or Pick a File...) → read the raw text → **if the source is Active Selection**, prompt (`getSelectionMode`, persisted like the separator) for as-is vs. absolute-path flattening; absolute path derives a key prefix via `getSelectionPrefix`, which uses `jsonc-parser`'s `getLocation` on the whole document at the selection's start offset (dropping the last segment when `isAtPropertyKey`) → prompt via `showQuickPick` for a separator (`getSeparator`, persisted in `context.globalState`, last-used reordered to the top) → `parseJson` + `flattenJson(parsed, separator, prefix)` → open the result as a new untitled `json` document. Keep source-reading (`getSourceText`) and flattening (`flatten.ts`) separate; new JSON sources should be added as new cases in `getSourceText`'s switch, not by touching `flatten.ts`.
- Build: esbuild bundles `src/extension.ts` → `dist/extension.js` (CJS, `vscode` external). Tests compile separately via plain `tsc` into `out/` and run against that output, not the esbuild bundle.
- `.github/workflows/publish.yml` runs `vsce publish` on any `v*` tag push, using a `VSCE_PAT` repository secret. Version bumps and `CHANGELOG.md` entries are done manually beforehand — there's no `vsce publish patch`-style auto-bump in use.

## Notes

- `flatten.ts` has no VS Code imports by design — keep it that way so its test suite (`src/test/flatten.test.ts`) can run logic-only assertions without the `vscode-test` Electron harness. It does import `jsonc-parser` (a plain JS lib, so the logic tests still run without Electron); the absolute-path prefix is computed in `extension.ts` and passed in as a plain array.
- `jsonc-parser` is the only runtime dependency (`parseJson` uses `parse` in `flatten.ts`, `getSelectionPrefix` uses `getLocation` in `extension.ts`); esbuild bundles it into `dist/extension.js`. **esbuild must resolve it via the ESM entry** — `esbuild.js` sets `mainFields: ['module', 'main']`, because jsonc-parser's default UMD build uses a factory-scoped `require("./impl/...")` that esbuild can't inline, which leaves broken relative requires that crash the extension at activation.
- Leaf value types (string/number/boolean/null) are preserved as-is, not stringified — `extension.ts` only stringifies the whole result once via `JSON.stringify` for display.
- `README.md` is the marketplace listing — it's what users see when deciding whether to install the extension, so it must read as marketing first (features, why it's useful, screenshots/GIFs). Any developer-facing info there should be minimal, kept to the end.
- `CHANGELOG.md` must be updated whenever a new version ships (bump matching `package.json`'s `version`).
- `pnpm-workspace.yaml`'s `allowBuilds` disables native builds for `keytar` and `@vscode/vsce-sign`. Both are only needed for `vsce login`'s OS-keychain credential storage and VSIX signing (`--sign-tool`), neither of which this repo's publish flow uses — it passes the PAT via `VSCE_PAT` instead.
