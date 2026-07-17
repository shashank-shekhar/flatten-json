export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type FlattenedSecrets = Record<string, JsonPrimitive>;

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walk(value: JsonValue, path: string, output: FlattenedSecrets): void {
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			walk(item, path === '' ? String(index) : `${path}:${index}`, output);
		});
		return;
	}
	if (isPlainObject(value)) {
		for (const key of Object.keys(value)) {
			walk(value[key], path === '' ? key : `${path}:${key}`, output);
		}
		return;
	}
	output[path] = value;
}

export function flattenToSecrets(parsed: unknown): FlattenedSecrets {
	if (!isPlainObject(parsed)) {
		throw new Error('Top-level JSON value must be an object (like dotnet secrets.json).');
	}
	const output: FlattenedSecrets = {};
	walk(parsed, '', output);
	return output;
}
