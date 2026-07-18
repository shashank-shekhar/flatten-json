# FlattenJson

Flatten nested JSON into flat, delimited keys — the format many config systems expect instead of nested objects. For example, .NET's `secrets.json` and `IConfiguration` use colon-delimited keys, so you'd otherwise be manually rewriting `appsettings.json` blocks by hand when moving values into user secrets.

## Features

- **Flattens nested objects and arrays** into flat, single-level keys — `:` by default, matching the format .NET's configuration system and `secrets.json` use.
- **Choose your separator** — colon for dotnet `secrets.json`/`IConfiguration`, dot for Java/Spring properties, double underscore for env var overrides, slash for AWS SSM Parameter Store, or single underscore/hyphen. Your last choice is remembered and offered first next time.
- **Four ways to grab your JSON** — flatten the active document, just your current selection, your clipboard contents, or pick any `.json` file from disk.
- **Preserves value types** — strings, numbers, booleans, and `null` come through as-is, not stringified.
- **Skips empty containers** — empty objects and arrays are omitted instead of producing orphaned keys.
- **Non-destructive** — results always open in a new, unsaved JSON tab. Your original file, selection, or clipboard is never modified.
- **Forgives a missing outer `{ }`** — if you select just an object's properties without the surrounding braces, it's wrapped and flattened automatically.

### Example

Input:

```json
{
  "ConnectionStrings": {
    "Default": "Server=.;Database=MyApp;"
  },
  "ApiKeys": {
    "Stripe": "sk_test_123",
    "SendGrid": "SG.abc123"
  },
  "AllowedHosts": ["localhost", "example.com"]
}
```

Output:

```json
{
  "ConnectionStrings:Default": "Server=.;Database=MyApp;",
  "ApiKeys:Stripe": "sk_test_123",
  "ApiKeys:SendGrid": "SG.abc123",
  "AllowedHosts:0": "localhost",
  "AllowedHosts:1": "example.com"
}
```

## Usage

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2. Run **Flatten JSON**.
3. Choose a source: **Active Document**, **Active Selection**, **Clipboard**, or **Pick a File...**.
4. Choose a separator: **:**, **.**, **__**, **/**, **_**, or **-**. Your last pick is offered first.
5. The flattened result opens in a new unsaved JSON tab — copy it wherever you need it.

## Requirements

None — works out of the box.

## Extension Settings

This extension does not contribute any settings.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for release notes.

---

## Development

- `pnpm install` — install dependencies
- `pnpm run watch` — build in watch mode
- `pnpm test` — run the test suite

See `CLAUDE.md` for architecture notes.
