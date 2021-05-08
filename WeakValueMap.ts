class WeakValueMap<TKey, TValue extends object> implements Map<TKey, TValue> {
    #map: Map<TKey, WeakRef<TValue>>;
    #registry: FinalizationRegistry<TKey>;

    #unregister(key: TKey): void {
        const value = this.#map.get(key);
        if (value !== undefined) {
            this.#registry.unregister(value);
        }
    }

    get [Symbol.toStringTag](): string {
        return "WeakValueMap";
    }

    constructor(input?: Iterable<[TKey, TValue]>) {
        if (!new.target) {
            throw new TypeError("Constructor WeakValueMap requires 'new'");
        }

        this.#map = new Map<TKey, WeakRef<TValue>>();
        this.#registry = new FinalizationRegistry((key: TKey) => {
            this.#map.delete(key);
        });
    
        if (input !== undefined && input !== null) {
            for (const [key, value] of input) {
                this.set(key, value);
            }
        }
    }

    get size(): number {
        return this.#map.size;
    }

    get(key: TKey): TValue | undefined {
        return this.#map.get(key)?.deref()!;
    }

    set(key: TKey, value: TValue): this {
        this.#unregister(key);
        this.#registry.register(value, key, value);
        this.#map.set(key, new WeakRef(value));
        return this;
    }

    has(key: TKey): boolean {
        return this.#map.has(key);
    }

    delete(key: TKey): boolean {
        this.#unregister(key);
        return this.#map.delete(key);
    }

    clear(): void {
        for (const key of this.#map.keys()) {
            this.#unregister(key);
            this.#map.delete(key);
        }
    }

    forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: any): void {
        this.#map.forEach((value, key) => {
            callbackfn.call(thisArg, value.deref()!, key, this);
        }, thisArg);
    }

    *entries(): IterableIterator<[TKey, TValue]> {
        for (const [key, value] of this.#map.entries()) {
            yield [key, value.deref()!];
        }
    }

    *keys(): IterableIterator<TKey> {
        for (const key of this.#map.keys()) {
            yield key;
        }
    }

    *values(): IterableIterator<TValue> {
        for (const value of this.#map.values()) {
            yield value.deref()!;
        }
    }
}

interface WeakValueMap<TKey, TValue extends object> {
    [Symbol.iterator]: typeof WeakValueMap.prototype.entries;
}

WeakValueMap.prototype[Symbol.iterator] = WeakValueMap.prototype.entries;

export default WeakValueMap;
