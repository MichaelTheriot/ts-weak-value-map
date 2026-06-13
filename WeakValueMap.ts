type WeakRefTarget = ConstructorParameters<typeof WeakRef>[0];

class WeakValueMap<TKey, TValue extends WeakRefTarget> implements Map<TKey, TValue> {
    #map: Map<TKey, WeakRef<TValue>>;
    #registry: FinalizationRegistry<TKey>;

    #unregister(key: TKey): void {
        const value = this.#map.get(key);

        if (value !== undefined) {
            this.#registry.unregister(value);
        }
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

    get [Symbol.toStringTag](): string {
        return "WeakValueMap";
    }

    get size(): number {
        return this.#map.size;
    }

    get(key: TKey): TValue | undefined {
        return this.#map.get(key)?.deref()!;
    }

    getOrInsert(key: TKey, defaultValue: TValue): TValue {
        const ref = this.#map.get(key);

        if (ref === undefined) {
          this.#registry.register(defaultValue, key, defaultValue);
          this.#map.set(key, new WeakRef(defaultValue));
          return defaultValue;
        }

        return ref.deref()!;
    }

    getOrInsertComputed(key: TKey, callback: (key: TKey) => TValue): TValue {
      const ref = this.#map.get(key);

        if (ref === undefined) {
          const defaultValue = callback(key);
          this.#registry.register(defaultValue, key, defaultValue);
          this.#map.set(key, new WeakRef(defaultValue));
          return defaultValue;
        }

        return ref.deref()!;
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
        for (const value of this.#map.values()) {
            this.#registry.unregister(value);
        }

        this.#map.clear();
    }

    forEach(callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void, thisArg?: any): void {
        this.#map.forEach((value, key) => {
            callbackfn.call(thisArg, value.deref()!, key, this);
        });
    }

    *entries(): MapIterator<[TKey, TValue]> {
        for (const [key, value] of this.#map.entries()) {
            yield [key, value.deref()!];
        }
    }

    *keys(): MapIterator<TKey> {
        for (const key of this.#map.keys()) {
            yield key;
        }
    }

    *values(): MapIterator<TValue> {
        for (const value of this.#map.values()) {
            yield value.deref()!;
        }
    }
}

interface WeakValueMap<TKey, TValue extends WeakRefTarget> {
    [Symbol.iterator]: typeof WeakValueMap.prototype.entries;
}

WeakValueMap.prototype[Symbol.iterator] = WeakValueMap.prototype.entries;

export default WeakValueMap;
