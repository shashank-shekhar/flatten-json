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

	test('throws the original error when wrapping does not fix the input', () => {
		let originalMessage: string | undefined;
		try {
			JSON.parse('[1, 2,]');
		} catch (err) {
			originalMessage = err instanceof Error ? err.message : String(err);
		}
		assert.throws(
			() => parseJson('[1, 2,]'),
			(err: unknown) => err instanceof Error && err.message === originalMessage
		);
	});
});
