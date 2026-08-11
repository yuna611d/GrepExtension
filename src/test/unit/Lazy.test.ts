import * as assert from 'assert';
import { Lazy } from '../../Commons/Lazy';

suite('Lazy', () => {

	test('does not call compute until get() is invoked', () => {
		let calls = 0;
		new Lazy(() => { calls++; return 1; });
		assert.strictEqual(calls, 0);
	});

	test('calls compute exactly once even across many get() calls', () => {
		let calls = 0;
		const lazy = new Lazy(() => { calls++; return 'value'; });

		lazy.get();
		lazy.get();
		lazy.get();

		assert.strictEqual(calls, 1);
	});

	test('returns the computed value', () => {
		const lazy = new Lazy(() => 42);
		assert.strictEqual(lazy.get(), 42);
	});

	test('returns the same value on every call, even if compute would return something different', () => {
		let next = 0;
		const lazy = new Lazy(() => ++next);

		const first = lazy.get();
		const second = lazy.get();

		assert.strictEqual(first, 1);
		assert.strictEqual(second, 1);
	});

	test('caches falsy values correctly (0, "", false, null)', () => {
		let calls = 0;
		const lazy = new Lazy(() => { calls++; return 0; });

		assert.strictEqual(lazy.get(), 0);
		assert.strictEqual(lazy.get(), 0);
		assert.strictEqual(calls, 1);
	});

	test('supports independent instances with independent caches', () => {
		const a = new Lazy(() => 'a');
		const b = new Lazy(() => 'b');

		assert.strictEqual(a.get(), 'a');
		assert.strictEqual(b.get(), 'b');
	});

});
