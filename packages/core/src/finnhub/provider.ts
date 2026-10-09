import { ProviderError } from "../errors";
import type { DateRange, Ipo, IpoDataProvider, Quote } from "../types";
import { parseFinnhubIpoCalendar, parseFinnhubQuote } from "./map";

const DEFAULT_BASE_URL = "https://finnhub.io/api/v1";
const DEFAULT_TIMEOUT_MS = 10_000;

export interface FinnhubProviderOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  logger?: Pick<Console, "warn">;
}

export class FinnhubProvider implements IpoDataProvider {
  readonly name = "Finnhub";
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #logger: Pick<Console, "warn">;

  constructor(options: FinnhubProviderOptions) {
    if (!options.apiKey) throw new Error("FinnhubProvider requires an API key");
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.#logger = options.logger ?? console;
  }

  async getIpoCalendar(range: DateRange): Promise<Ipo[]> {
    const json = await this.#request("/calendar/ipo", { from: range.from, to: range.to });
    const { ipos, skipped } = this.#parse(() => parseFinnhubIpoCalendar(json));
    if (skipped > 0) this.#logger.warn(`[Finnhub] Skipped ${skipped} unusable IPO record(s)`);
    return ipos;
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return null;

    const json = await this.#request("/quote", { symbol: normalized });
    return this.#parse(() => parseFinnhubQuote(normalized, json));
  }

  async #request(path: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(`${this.#baseUrl}${path}`);
    url.search = new URLSearchParams(params).toString();

    let response: Response;
    try {
      response = await this.#fetch(url, {
        headers: { "X-Finnhub-Token": this.#apiKey },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      throw new ProviderError("UNAVAILABLE", "Could not reach Finnhub", { cause: error });
    }

    if (response.status === 429) {
      throw new ProviderError("RATE_LIMITED", "Finnhub rate limit exceeded");
    }
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("UNAUTHORIZED", "Finnhub rejected the API key");
    }
    if (!response.ok) {
      throw new ProviderError("UNAVAILABLE", `Finnhub responded with HTTP ${response.status}`);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ProviderError("BAD_RESPONSE", "Finnhub returned invalid JSON", { cause: error });
    }
  }

  #parse<T>(parse: () => T): T {
    try {
      return parse();
    } catch (error) {
      throw new ProviderError("BAD_RESPONSE", "Finnhub returned an unexpected response shape", {
        cause: error,
      });
    }
  }
}