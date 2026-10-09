import { TtlCache } from "./ttl-cache";
import type { DateRange, Ipo, IpoDataProvider, Quote } from "./types";

const MINUTE_MS = 60_000;

export interface CacheTtls {
  calendarMs: number;
  quoteMs: number;
}

export const DEFAULT_CACHE_TTLS: CacheTtls = {
  calendarMs: 60 * MINUTE_MS,
  quoteMs: MINUTE_MS,
};

export class CachedProvider implements IpoDataProvider {
  readonly name: string;
  readonly #inner: IpoDataProvider;
  readonly #ttls: CacheTtls;
  readonly #cache = new TtlCache();

  constructor(inner: IpoDataProvider, ttls: CacheTtls = DEFAULT_CACHE_TTLS) {
    this.name = inner.name;
    this.#inner = inner;
    this.#ttls = ttls;
  }

  getIpoCalendar(range: DateRange): Promise<Ipo[]> {
    return this.#cache.getOrLoad(
      `calendar:${range.from}:${range.to}`,
      this.#ttls.calendarMs,
      () => this.#inner.getIpoCalendar(range),
    );
  }

  getQuote(symbol: string): Promise<Quote | null> {
    return this.#cache.getOrLoad(
      `quote:${symbol.trim().toUpperCase()}`,
      this.#ttls.quoteMs,
      () => this.#inner.getQuote(symbol),
    );
  }
}