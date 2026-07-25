/**
 * Computes and caches a value on first access. Replaces the repeated
 * "if (this._x === null) { return this._x = compute(); } return this._x;" pattern.
 */
export class Lazy<T> {

    private hasValue = false;
    private value: T | undefined;

    constructor(private readonly compute: () => T) {}

    public get(): T {
        if (!this.hasValue) {
            this.value = this.compute();
            this.hasValue = true;
        }
        return this.value as T;
    }

}
