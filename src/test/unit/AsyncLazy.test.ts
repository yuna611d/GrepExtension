import * as assert from 'assert';
import { AsyncLazy } from '../../Commons/AsyncLazy';

suite('AsyncLazy', () => {

	test('does not call compute until get() is invoked', () => {
		let calls = 0;
		new AsyncLazy(async () => { calls++; return 1; });

		assert.strictEqual(calls, 0);
	});

	test('calls compute exactly once even across many get() calls', async () => {
		let calls = 0;
		const lazy = new AsyncLazy(async () => { calls++; return 'value'; });

		assert.strictEqual(await lazy.get(), 'value');
		assert.strictEqual(await lazy.get(), 'value');
		assert.strictEqual(await lazy.get(), 'value');

		assert.strictEqual(calls, 1);
	});

	test('callers that ask while the first computation is still running join it', async () => {
		let calls = 0;
		let release: (value: string) => void = () => {};
		const lazy = new AsyncLazy(() => {
			calls++;
			return new Promise<string>(resolve => { release = resolve; });
		});

		// Caching the value rather than the promise would start a second computation here, because
		// the first has not produced anything to cache yet.
		const asks = [lazy.get(), lazy.get(), lazy.get()];
		release('value');

		assert.deepStrictEqual(await Promise.all(asks), ['value', 'value', 'value']);
		assert.strictEqual(calls, 1);
	});

	test('caches a rejection rather than retrying it', async () => {
		let calls = 0;
		const lazy = new AsyncLazy(async () => { calls++; throw new Error('nope'); });

		await assert.rejects(lazy.get(), /nope/);
		await assert.rejects(lazy.get(), /nope/);

		assert.strictEqual(calls, 1);
	});

	test('caches falsy values correctly (0, "", false, null)', async () => {
		for (const value of [0, '', false, null]) {
			let calls = 0;
			const lazy = new AsyncLazy(async () => { calls++; return value; });

			assert.strictEqual(await lazy.get(), value);
			assert.strictEqual(await lazy.get(), value);
			assert.strictEqual(calls, 1, `recomputed for ${JSON.stringify(value)}`);
		}
	});

	test('resolved() answers with the given value and computes nothing', async () => {
		const lazy = AsyncLazy.resolved('already known');

		assert.strictEqual(await lazy.get(), 'already known');
		assert.strictEqual(await lazy.get(), 'already known');
	});

	test('supports independent instances with independent caches', async () => {
		let calls = 0;
		const make = () => new AsyncLazy(async () => ++calls);

		assert.strictEqual(await make().get(), 1);
		assert.strictEqual(await make().get(), 2);
	});

});
