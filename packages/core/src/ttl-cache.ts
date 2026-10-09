interface Entry {
    value: Promise<unknown>;
    expiresAt: number;
  }
  
  const DEFAULT_MAX_ENTRIES = 500;
  
  export class TtlCache {
    readonly #entries = new Map<string, Entry>();
    readonly #maxEntries: number;
  
    constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
      this.#maxEntries = maxEntries;
    }
  
    getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const cached = this.#entries.get(key);
      if (cached && cached.expiresAt > now) return cached.value as Promise<T>;
  
      const value = load();
      this.#set(key, { value, expiresAt: now + ttlMs });
      value.catch(() => {
        if (this.#entries.get(key)?.value === value) this.#entries.delete(key);
      });
      return value;
    }
  
    #set(key: string, entry: Entry): void {
      this.#entries.delete(key);
      if (this.#entries.size >= this.#maxEntries) {
        const oldestKey = this.#entries.keys().next().value;
        if (oldestKey !== undefined) this.#entries.delete(oldestKey);
      }
      this.#entries.set(key, entry);
    }
  }