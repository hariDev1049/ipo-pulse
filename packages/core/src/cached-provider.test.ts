import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CachedProvider } from "./cached-provider";
import type { Ipo, IpoDataProvider, Quote } from "./types";

const HOUR_MS = 60 * 60_000;
const range = { from: "2026-10-01", to: "2026-10-15" };

const ipo: Ipo = {
  date: "2026-10-09",
  symbol: "TRXB",
  name: "TRex Bio, Inc.",
  exchange: "NASDAQ Global Select",
  priceRange: { low: 14, high: 16 },
  shares: 8333334,
  totalValue: 133333344,
  status: "expected",
  isSpac: false,
};

const quote: Quote = {
  symbol: "TRXB",
  current: 15.5,
  change: 0.5,
  percentChange: 3.33,
  asOf: "2026-10-09T00:00:00.000Z",
};

function createFakeProvider() {
  return {
    name: "Fake",
    getIpoCalendar: vi.fn<IpoDataProvider["getIpoCalendar"]>(async () => [ipo]),
    getQuote: vi.fn<IpoDataProvider["getQuote"]>(async () => quote),
  } satisfies IpoDataProvider;
}

describe("CachedProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the inner provider's name", () => {
    expect(new CachedProvider(createFakeProvider()).name).toBe("Fake");
  });

  it("serves repeated calendar requests from the cache", async () => {
    const inner = createFakeProvider();
    const provider = new CachedProvider(inner);

    expect(await provider.getIpoCalendar(range)).toEqual([ipo]);
    expect(await provider.getIpoCalendar(range)).toEqual([ipo]);

    expect(inner.getIpoCalendar).toHaveBeenCalledTimes(1);
  });

  it("refetches the calendar after one hour", async () => {
    const inner = createFakeProvider();
    const provider = new CachedProvider(inner);

    await provider.getIpoCalendar(range);
    vi.advanceTimersByTime(HOUR_MS - 1);
    await provider.getIpoCalendar(range);
    expect(inner.getIpoCalendar).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await provider.getIpoCalendar(range);
    expect(inner.getIpoCalendar).toHaveBeenCalledTimes(2);
  });

  it("caches each date range separately", async () => {
    const inner = createFakeProvider();
    const provider = new CachedProvider(inner);

    await provider.getIpoCalendar(range);
    await provider.getIpoCalendar({ from: "2026-11-01", to: "2026-11-15" });

    expect(inner.getIpoCalendar).toHaveBeenCalledTimes(2);
  });

  it("caches quotes for 60 seconds, ignoring symbol case and spaces", async () => {
    const inner = createFakeProvider();
    const provider = new CachedProvider(inner);

    await provider.getQuote("trxb");
    await provider.getQuote(" TRXB ");
    expect(inner.getQuote).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_000);
    await provider.getQuote("TRXB");
    expect(inner.getQuote).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    const inner = createFakeProvider();
    const provider = new CachedProvider(inner);

    await Promise.all([provider.getQuote("TRXB"), provider.getQuote("TRXB")]);

    expect(inner.getQuote).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const inner = createFakeProvider();
    inner.getQuote.mockRejectedValueOnce(new Error("Finnhub is down"));
    const provider = new CachedProvider(inner);

    await expect(provider.getQuote("TRXB")).rejects.toThrow("Finnhub is down");
    await expect(provider.getQuote("TRXB")).resolves.toEqual(quote);

    expect(inner.getQuote).toHaveBeenCalledTimes(2);
  });
});