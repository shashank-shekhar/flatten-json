import { parse as parseJsonc, ParseError } from 'jsonc-parser';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type FlattenedJson = Record<string, JsonPrimitive>;

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJson(rawText: string): unknown {
	// A selection pulled out of an array/object often keeps a dangling trailing comma
	// (e.g. a single element: `{ ... },`); a valid top-level value never ends in one, so drop it.
	const trimmed = rawText.trim();
	const body = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
	// jsonc-parser tolerates comments and internal trailing commas — both common in the .NET
	// config and VS Code JSON files this targets. A selection also often copies just an object's
	// body without its braces, so retry wrapped before giving up.
	for (const candidate of [body, `{${body}}`]) {
		const errors: ParseError[] = [];
		const result = parseJsonc(candidate, errors, { allowTrailingComma: true });
		if (errors.length === 0 && result !== undefined) {
			return result;
		}
	}
	// Nothing parsed cleanly; rethrow the strict parser's error for a precise message.
	return JSON.parse(rawText);
}

function walk(value: JsonValue, path: string, separator: string, output: FlattenedJson): void {
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			walk(item, path === '' ? String(index) : `${path}${separator}${index}`, separator, output);
		});
		return;
	}
	if (isPlainObject(value)) {
		for (const key of Object.keys(value)) {
			walk(value[key], path === '' ? key : `${path}${separator}${key}`, separator, output);
		}
		return;
	}
	if (Object.prototype.hasOwnProperty.call(output, path)) {
		throw new Error(`Ambiguous key "${path}": multiple values collide when flattened with separator "${separator}". Choose a different separator.`);
	}
	output[path] = value;
}

export function flattenJson(
	parsed: unknown,
	separator: string = ':',
	prefix: (string | number)[] = [],
): FlattenedJson {
	if (!isPlainObject(parsed)) {
		throw new Error('Top-level JSON value must be an object (like dotnet secrets.json).');
	}
	const output: FlattenedJson = {};
	// `prefix` re-homes the keys under an absolute path (e.g. a selection's location in the whole document).
	walk(parsed, prefix.map(String).join(separator), separator, output);
	return output;
}
