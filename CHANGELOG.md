# Change Log

All notable changes to the "flatten-json" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - 2026-07-18

- Initial release: flatten nested JSON into flat, delimited keys, reading from the active document, active selection, clipboard, or a picked file.
- Add a key-separator picker (`:`, `.`, `__`, `/`, `_`, `-`) shown after choosing a JSON source, with the last-used separator remembered and offered first on the next run.
- Retry parsing wrapped in `{ }` when the source is invalid JSON only because its surrounding braces are missing.
- Throw an error instead of silently dropping data when two keys collide after flattening.