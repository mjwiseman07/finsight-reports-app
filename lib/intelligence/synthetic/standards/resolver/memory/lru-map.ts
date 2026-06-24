export class LRUMap<K, V> {
  private readonly map = new Map<K, V>();

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0 || maxSize > 100_000) {
      throw new Error(`LRUMap maxSize out of range: ${maxSize}`);
    }
  }

  get(k: K): V | undefined {
    const v = this.map.get(k);
    if (v === undefined) {
      return undefined;
    }
    this.map.delete(k);
    this.map.set(k, v);
    return v;
  }

  set(k: K, v: V): K | null {
    if (this.map.has(k)) {
      this.map.delete(k);
    }
    let evicted: K | null = null;
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next().value;
      this.map.delete(first as K);
      evicted = first as K;
    }
    this.map.set(k, v);
    return evicted;
  }

  delete(k: K): boolean {
    return this.map.delete(k);
  }

  has(k: K): boolean {
    return this.map.has(k);
  }

  size(): number {
    return this.map.size;
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }
}
