/**
 * Computes and caches an asynchronous value on first access, the counterpart of {@link Lazy}.
 *
 * The *promise* is what gets cached, not the value it settles to, so callers that ask before the
 * first computation has finished join it rather than starting a second one. A rejection is cached
 * like any other outcome: the answer to "what is this file" does not become knowable by asking
 * again within the same visit.
 */
export class AsyncLazy<T> {

    private promise: Promise<T> | undefined;

    constructor(private readonly compute: () => Promise<T>) {}

    public get(): Promise<T> {
        this.promise ??= this.compute();
        return this.promise;
    }

    /**
     * An already-answered instance, for when the value has been obtained some other way and there
     * is nothing left to compute.
     */
    public static resolved<T>(value: T): AsyncLazy<T> {
        return new AsyncLazy(() => Promise.resolve(value));
    }

}
