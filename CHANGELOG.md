# Change Log

All notable changes to the "flatten-json" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Tolerate JSONC in the source — trailing commas and `//` / `/* */` comments (common in .NET config and VS Code JSON) are now accepted, via `jsonc-parser`. Also handle a dangling trailing comma on a selection pulled out of an array (e.g. a single `{ … },` element).
- When flattening an **Active Selection**, ask whether to flatten it as-is or with the absolute path from the document root, so a selected nested value produces fully-qualified keys (e.g. `Parent:Child`). The choice is remembered and offered first next time.

## [1.0.0] - 2026-07-18

- Initial release: flatten nested JSON into flat, delimited keys, reading from the active document, active selection, clipboard, or a picked file.
- Add a key-separator picker (`:`, `.`, `__`, `/`, `_`, `-`) shown after choosing a JSON source, with the last-used separator remembered and offered first on the next run.
- Retry parsing wrapped in `{ }` when the source is invalid JSON only because its surrounding braces are missing.
- Throw an error instead of silently dropping data when two keys collide after flattening.