import * as assert from 'assert';
import { flattenToSecrets } from '../flatten';

suite('flattenToSecrets', () => {
	test('flattens single-level object', () => {
		assert.deepStrictEqual(flattenToSecrets({ Foo: 'bar' }), { Foo: 'bar' });
	});

	test('flattens nested objects with colon separator', () => {
		assert.deepStrictEqual(
			flattenToSecrets({ Parent: { Child: 'val' } }),
			{ 'Parent:Child': 'val' }
		);
	});

	test('flattens arrays using index-based keys', () => {
		assert.deepStrictEqual(
			flattenToSecrets({ Parent: ['a', 'b'] }),
			{ 'Parent:0': 'a', 'Parent:1': 'b' }
		);
	});

	test('flattens arrays of nested objects', () => {
		assert.deepStrictEqual(
			flattenToSecrets({ A: [{ B: 1 }, { B: 2 }] }),
			{ 'A:0:B': 1, 'A:1:B': 2 }
		);
	});

	test('omits empty object branches', () => {
		assert.deepStrictEqual(flattenToSecrets({ A: {} }), {});
	});

	test('omits empty array branches', () => {
		assert.deepStrictEqual(flattenToSecrets({ A: [] }), {});
	});

	test('leaves index gaps when an empty container is interleaved in an array', () => {
		assert.deepStrictEqual(flattenToSecrets({ A: [{}, 'x'] }), { 'A:1': 'x' });
	});

	test('preserves original leaf types without stringify coercion', () => {
		const result = flattenToSecrets({ S: 'x', N: 1, B: true, Nu: null });
		assert.deepStrictEqual(result, { S: 'x', N: 1, B: true, Nu: null });
		assert.strictEqual(typeof result.N, 'number');
		assert.strictEqual(typeof result.B, 'boolean');
		assert.strictEqual(result.Nu, null);
	});

	test('writes falsy leaves that are not empty containers', () => {
		assert.deepStrictEqual(
			flattenToSecrets({ Zero: 0, False: false, Empty: '' }),
			{ Zero: 0, False: false, Empty: '' }
		);
	});

	test('throws when top-level value is an array', () => {
		assert.throws(() => flattenToSecrets([1, 2, 3]));
	});

	test('throws when top-level value is a primitive', () => {
		assert.throws(() => flattenToSecrets('hello'));
		assert.throws(() => flattenToSecrets(42));
		assert.throws(() => flattenToSecrets(null));
	});
});
