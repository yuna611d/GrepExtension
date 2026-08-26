/**
 * Runs `task` over every item, at most `limit` of them in flight at once.
 *
 * Awaiting filesystem calls one at a time keeps the extension host responsive but makes a search
 * far slower than it needs to be: each call is a round trip to the thread pool, and nothing else
 * is asked for while it is out. Issuing them all at once is not the answer either - a directory
 * with tens of thousands of entries would open that many handles and run the process out of them.
 *
 * A fixed number of workers draw from a shared cursor, so the pool stays busy without the count
 * of outstanding calls ever depending on how large the directory happens to be.
 *
 * Results are not collected: this is for warming caches on the items themselves, and the caller
 * reads the answers back in its own order afterwards. The first rejection is propagated, after
 * the calls already in flight have settled.
 */
export async function forEachWithLimit<T>(
    items: readonly T[],
    limit: number,
    task: (item: T) => Promise<unknown>
): Promise<void> {
    let cursor = 0;

    const worker = async () => {
        while (cursor < items.length) {
            await task(items[cursor++]);
        }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
}
