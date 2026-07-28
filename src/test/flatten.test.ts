import * as assert from 'assert';
import { flattenJson, parseJson } from '../flatten';

suite('flattenJson', () => {
	test('flattens single-level object', () => {
		assert.deepStrictEqual(flattenJson({ Foo: 'bar' }), { Foo: 'bar' });
	});

	test('flattens nested objects with colon separator', () => {
		assert.deepStrictEqual(
			flattenJson({ Parent: { Child: 'val' } }),
			{ 'Parent:Child': 'val' }
		);
	});

	test('flattens arrays using index-based keys', () => {
		assert.deepStrictEqual(
			flattenJson({ Parent: ['a', 'b'] }),
			{ 'Parent:0': 'a', 'Parent:1': 'b' }
		);
	});

	test('flattens arrays of nested objects', () => {
		assert.deepStrictEqual(
			flattenJson({ A: [{ B: 1 }, { B: 2 }] }),
			{ 'A:0:B': 1, 'A:1:B': 2 }
		);
	});

	test('omits empty object branches', () => {
		assert.deepStrictEqual(flattenJson({ A: {} }), {});
	});

	test('omits empty array branches', () => {
		assert.deepStrictEqual(flattenJson({ A: [] }), {});
	});

	test('leaves index gaps when an empty container is interleaved in an array', () => {
		assert.deepStrictEqual(flattenJson({ A: [{}, 'x'] }), { 'A:1': 'x' });
	});

	test('preserves original leaf types without stringify coercion', () => {
		const result = flattenJson({ S: 'x', N: 1, B: true, Nu: null });
		assert.deepStrictEqual(result, { S: 'x', N: 1, B: true, Nu: null });
		assert.strictEqual(typeof result.N, 'number');
		assert.strictEqual(typeof result.B, 'boolean');
		assert.strictEqual(result.Nu, null);
	});

	test('writes falsy leaves that are not empty containers', () => {
		assert.deepStrictEqual(
			flattenJson({ Zero: 0, False: false, Empty: '' }),
			{ Zero: 0, False: false, Empty: '' }
		);
	});

	test('throws when top-level value is an array', () => {
		assert.throws(() => flattenJson([1, 2, 3]));
	});

	test('throws when top-level value is a primitive', () => {
		assert.throws(() => flattenJson('hello'));
		assert.throws(() => flattenJson(42));
		assert.throws(() => flattenJson(null));
	});

	test('flattens nested objects with a custom separator', () => {
		assert.deepStrictEqual(flattenJson({ Parent: { Child: 'val' } }, '.'), { 'Parent.Child': 'val' });
	});

	test('flattens arrays with a custom separator', () => {
		assert.deepStrictEqual(flattenJson({ Parent: ['a', 'b'] }, '/'), { 'Parent/0': 'a', 'Parent/1': 'b' });
	});

	test('throws when a key already containing the separator collides with a nested path', () => {
		assert.throws(() => flattenJson({ 'A:B': 1, A: { B: 2 } }));
	});

	test('throws when an empty separator causes two distinct paths to collide', () => {
		assert.throws(() => flattenJson({ A: { B: 1 }, AB: 2 }, ''));
	});

	test('prefixes keys with an absolute path', () => {
		assert.deepStrictEqual(
			flattenJson({ Child: 'val' }, ':', ['Parent']),
			{ 'Parent:Child': 'val' }
		);
	});

	test('prefixes with a multi-segment path including array indices', () => {
		assert.deepStrictEqual(
			flattenJson({ K: 2 }, ':', ['Other', 0]),
			{ 'Other:0:K': 2 }
		);
	});

	test('applies the chosen separator to the prefix too', () => {
		assert.deepStrictEqual(
			flattenJson({ Child: { Deep: 1 } }, '.', ['Parent']),
			{ 'Parent.Child.Deep': 1 }
		);
	});

	test('an empty prefix behaves like no prefix', () => {
		assert.deepStrictEqual(flattenJson({ Parent: { Child: 'val' } }, ':', []), { 'Parent:Child': 'val' });
	});
});

suite('parseJson', () => {
	test('parses well-formed JSON as-is', () => {
		assert.deepStrictEqual(parseJson('{"Foo":"bar"}'), { Foo: 'bar' });
	});

	test('wraps and parses an object body missing its surrounding braces', () => {
		assert.deepStrictEqual(
			parseJson('"Foo": "bar", "Baz": { "Qux": 1 }'),
			{ Foo: 'bar', Baz: { Qux: 1 } }
		);
	});

	test('throws the original error when leniency does not fix the input', () => {
		let originalMessage: string | undefined;
		try {
			JSON.parse('[1, 2');
		} catch (err) {
			originalMessage = err instanceof Error ? err.message : String(err);
		}
		assert.throws(
			() => parseJson('[1, 2'),
			(err: unknown) => err instanceof Error && err.message === originalMessage
		);
	});

	test('tolerates a trailing comma in an object', () => {
		assert.deepStrictEqual(parseJson('{"Foo":"bar",}'), { Foo: 'bar' });
	});

	test('tolerates a trailing comma in an array', () => {
		assert.deepStrictEqual(parseJson('{"A":[1,2,]}'), { A: [1, 2] });
	});

	test('tolerates trailing commas in nested containers with whitespace', () => {
		assert.deepStrictEqual(
			parseJson('{\n\t"A": { "B": 1, },\n}'),
			{ A: { B: 1 } }
		);
	});

	test('tolerates a trailing comma on a braceless object body', () => {
		assert.deepStrictEqual(parseJson('"Foo": "bar",'), { Foo: 'bar' });
	});

	test('keeps commas and brackets that live inside string values', () => {
		assert.deepStrictEqual(parseJson('{"A":"x,]","B":"y,}"}'), { A: 'x,]', B: 'y,}' });
	});

	test('keeps a trailing comma that is part of a string value', () => {
		assert.deepStrictEqual(parseJson('{"A":"say \\"hi\\",",}'), { A: 'say "hi",' });
	});

	test('tolerates line comments alongside a trailing comma', () => {
		assert.deepStrictEqual(
			parseJson('{\n\t"A": 1, // note\n\t"B": 2,\n}'),
			{ A: 1, B: 2 }
		);
	});

	test('tolerates block comments', () => {
		assert.deepStrictEqual(parseJson('{ /* header */ "A": 1 }'), { A: 1 });
	});

	test('does not treat a URL inside a string as a comment', () => {
		assert.deepStrictEqual(parseJson('{ "A": "http://example.com", }'), { A: 'http://example.com' });
	});

	test('throws on genuinely malformed input (double comma)', () => {
		assert.throws(() => parseJson('{ "A": 1,, }'));
	});

	test('tolerates an array element selected with its dangling trailing comma', () => {
		const selection = '      {\n        "name": "item",\n        "index": 0,\n        "active": true,\n      },';
		assert.deepStrictEqual(parseJson(selection), { name: 'item', index: 0, active: true });
	});
});
