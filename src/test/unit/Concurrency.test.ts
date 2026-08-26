import * as assert from 'assert';
import { forEachWithLimit } from '../../Commons/Concurrency';

// A task that does not settle until it is told to, so the number in flight can be observed.
function gatedTask() {
	const releases: (() => void)[] = [];
	let inFlight = 0;
	let peakInFlight = 0;

	const task = () => {
		inFlight++;
		peakInFlight = Math.max(peakInFlight, inFlight);
		return new Promise<void>(resolve => {
			releases.push(() => { inFlight--; resolve(); });
		});
	};

	return {
		task,
		get peakInFlight() { return peakInFlight; },
		releaseAll: async () => {
			// Each release lets a worker pick up the next item, which needs a turn to happen.
			while (releases.length > 0) {
				releases.shift()!();
				await Promise.resolve();
			}
		},
	};
}

suite('forEachWithLimit', () => {

	test('runs the task for every item', async () => {
		const seen: number[] = [];

		await forEachWithLimit([1, 2, 3, 4, 5], 2, async item => { seen.push(item); });

		assert.deepStrictEqual(seen.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
	});

	test('never has more than the limit in flight at once', async () => {
		const gate = gatedTask();
		const items = Array.from({ length: 20 }, (_, i) => i);

		const done = forEachWithLimit(items, 4, gate.task);
		await gate.releaseAll();
		await done;

		// Issuing them all at once is what would exhaust file handles on a large directory.
		assert.strictEqual(gate.peakInFlight, 4);
	});

	test('starts no more workers than there are items', async () => {
		const gate = gatedTask();

		const done = forEachWithLimit([1, 2], 32, gate.task);
		await gate.releaseAll();
		await done;

		assert.strictEqual(gate.peakInFlight, 2);
	});

	test('does nothing for an empty list', async () => {
		let calls = 0;

		await forEachWithLimit([], 4, async () => { calls++; });

		assert.strictEqual(calls, 0);
	});

	test('propagates a rejection', async () => {
		await assert.rejects(
			forEachWithLimit([1, 2, 3], 2, async item => {
				if (item === 2) { throw new Error('nope'); }
			}),
			/nope/);
	});

});
