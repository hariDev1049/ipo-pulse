import { ProviderError, type Ipo, type IpoDataProvider, type Quote } from "@ipo-pulse/core";
import { describe, expect, it, vi } from "vitest";
import { calendarWindow, toUtcDate } from "./dates";
import { connectClient } from "./testing";

const FROZEN = new Date("2026-10-09T12:00:00.000Z");
const today = toUtcDate(FROZEN);

function ipo(partial: Partial<Ipo> & Pick<Ipo, "name" | "status">): Ipo {
  return {
    date: null,
    symbol: null,
    exchange: null,
    priceRange: null,
    shares: null,
    totalValue: null,
    isSpac: false,
    ...partial,
  };
}

const catalog: Ipo[] = [
  ipo({
    date: "2026-10-09",
    symbol: "TRXB",
    name: "TRex Bio, Inc.",
    exchange: "NASDAQ Global Select",
    priceRange: { low: 14, high: 16 },
    shares: 8333334,
    totalValue: 133333344,
    status: "expected",
  }),
  ipo({
    date: "2026-10-16",
    symbol: "FUTR",
    name: "Future Labs, Inc.",
    priceRange: { low: 20, high: 22 },
    status: "expected",
  }),
  ipo({
    date: "2026-10-12",
    symbol: "NEWU",
    name: "Blank Check Acquisition Corp.",
    priceRange: { low: 10, high: 10 },
    status: "expected",
    isSpac: true,
  }),
  ipo({
    date: "2026-10-02",
    symbol: "HRBR",
    name: "Harbor Analytics, Inc.",
    priceRange: { low: 17, high: 17 },
    status: "priced",
  }),
  ipo({
    date: "2026-09-01",
    symbol: "OLDX",
    name: "Old Example, Inc.",
    priceRange: { low: 8, high: 8 },
    status: "priced",
  }),
  ipo({
    date: "2026-10-01",
    name: "Northwind Systems, Inc.",
    status: "filed",
  }),
];

const harborQuote: Quote = {
  symbol: "HRBR",
  current: 18.7,
  change: 1.7,
  percentChange: 10,
  asOf: "2026-10-09T12:00:00.000Z",
};

function createProvider(overrides: Partial<IpoDataProvider> = {}): IpoDataProvider {
  return {
    name: "Fake",
    getIpoCalendar: async () => catalog,
    getQuote: async (symbol) => (symbol === "HRBR" ? harborQuote : null),
    ...overrides,
  };
}

async function setup(provider: IpoDataProvider = createProvider()) {
  return connectClient(provider, { now: () => FROZEN });
}

describe("MCP tools", () => {
  it("lists the four read-only tools", async () => {
    const client = await setup();
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "get_upcoming_ipos",
      "get_recent_ipos",
      "get_ipo_details",
      "get_listing_performance",
    ]);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("asks the provider for one shared calendar window", async () => {
    const getIpoCalendar = vi.fn(async () => catalog);
    const client = await setup(createProvider({ getIpoCalendar }));

    await client.callTool({ name: "get_upcoming_ipos", arguments: {} });
    await client.callTool({ name: "get_recent_ipos", arguments: {} });
    await client.callTool({ name: "get_ipo_details", arguments: { query: "TRXB" } });

    expect(getIpoCalendar).toHaveBeenCalledTimes(3);
    expect(getIpoCalendar).toHaveBeenNthCalledWith(1, calendarWindow(today));
    expect(getIpoCalendar).toHaveBeenNthCalledWith(2, calendarWindow(today));
    expect(getIpoCalendar).toHaveBeenNthCalledWith(3, calendarWindow(today));
  });

  describe("get_upcoming_ipos", () => {
    it("returns expected and priced IPOs from today through the default 14 days, hiding SPACs", async () => {
      const client = await setup();
      const result = await client.callTool({ name: "get_upcoming_ipos", arguments: {} });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({
        source: "Fake",
        asOf: FROZEN.toISOString(),
        ipos: [{ symbol: "TRXB" }, { symbol: "FUTR" }],
      });
    });

    it("includes SPACs when asked", async () => {
      const client = await setup();
      const result = await client.callTool({
        name: "get_upcoming_ipos",
        arguments: { includeSpacs: true },
      });

      expect(result.structuredContent).toMatchObject({
        ipos: [{ symbol: "TRXB" }, { symbol: "NEWU" }, { symbol: "FUTR" }],
      });
    });
  });

  describe("get_recent_ipos", () => {
    it("returns priced IPOs from the past 30 days, excluding today", async () => {
      const client = await setup();
      const result = await client.callTool({ name: "get_recent_ipos", arguments: {} });

      expect(result.structuredContent).toMatchObject({
        ipos: [{ symbol: "HRBR" }],
      });
    });

    it("widens the lookback when days is 90", async () => {
      const client = await setup();
      const result = await client.callTool({ name: "get_recent_ipos", arguments: { days: 90 } });

      expect(result.structuredContent).toMatchObject({
        ipos: [{ symbol: "HRBR" }, { symbol: "OLDX" }],
      });
    });
  });

  describe("get_ipo_details", () => {
    it("matches a ticker exactly and a company name as a substring", async () => {
      const client = await setup();
      const bySymbol = await client.callTool({ name: "get_ipo_details", arguments: { query: "trxb" } });
      const byName = await client.callTool({ name: "get_ipo_details", arguments: { query: "harbor" } });

      expect(bySymbol.structuredContent).toMatchObject({ ipos: [{ symbol: "TRXB" }] });
      expect(byName.structuredContent).toMatchObject({ ipos: [{ name: "Harbor Analytics, Inc." }] });
    });

    it("returns an empty list when nothing matches", async () => {
      const client = await setup();
      const result = await client.callTool({ name: "get_ipo_details", arguments: { query: "zzz" } });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({ ipos: [] });
    });
  });

  describe("get_listing_performance", () => {
    it("compares the IPO midpoint with the current quote", async () => {
      const client = await setup();
      const result = await client.callTool({
        name: "get_listing_performance",
        arguments: { symbol: " hrbr " },
      });

      expect(result.structuredContent).toEqual({
        source: "Fake",
        asOf: harborQuote.asOf,
        symbol: "HRBR",
        name: "Harbor Analytics, Inc.",
        ipoPrice: 17,
        current: 18.7,
        changePercent: ((18.7 - 17) / 17) * 100,
      });
    });

    it("returns null quote fields when the stock is not trading yet", async () => {
      const client = await setup();
      const result = await client.callTool({
        name: "get_listing_performance",
        arguments: { symbol: "TRXB" },
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({
        symbol: "TRXB",
        ipoPrice: 15,
        current: null,
        changePercent: null,
      });
    });

    it("returns a model-readable error when the symbol is unknown", async () => {
      const client = await setup();
      const result = await client.callTool({
        name: "get_listing_performance",
        arguments: { symbol: "NOPE" },
      });

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: expect.stringContaining('No IPO found for symbol "NOPE"') },
      ]);
    });
  });

  it("turns a provider rate limit into a tool error", async () => {
    const client = await setup(
      createProvider({
        getIpoCalendar: async () => {
          throw new ProviderError("RATE_LIMITED", "too many requests");
        },
      }),
    );

    const result = await client.callTool({ name: "get_upcoming_ipos", arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "The IPO data provider is rate-limited. Try again in a minute." },
    ]);
  });

  it("rejects days above the maximum before the handler runs", async () => {
    const client = await setup();
    const result = await client.callTool({ name: "get_upcoming_ipos", arguments: { days: 999 } });

    expect(result.isError).toBe(true);
  });
});