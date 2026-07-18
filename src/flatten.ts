export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type FlattenedJson = Record<string, JsonPrimitive>;

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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

export function flattenJson(parsed: unknown, separator: string = ':'): FlattenedJson {
	if (!isPlainObject(parsed)) {
		throw new Error('Top-level JSON value must be an object (like dotnet secrets.json).');
	}
	const output: FlattenedJson = {};
	walk(parsed, '', separator, output);
	return output;
}
