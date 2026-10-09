import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "../errors";
import fixture from "./__fixtures__/ipo-calendar.json";
import { FinnhubProvider } from "./provider";

const range = { from: "2026-10-01", to: "2026-10-15" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(result: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const logger = { warn: vi.fn() };
  const provider = new FinnhubProvider({ apiKey: "test-key", fetch: fetchMock, logger });
  return { provider, fetchMock, logger };
}

describe("FinnhubProvider", () => {
  it("requires an API key", () => {
    expect(() => new FinnhubProvider({ apiKey: "" })).toThrow();
  });

  describe("getIpoCalendar", () => {
    it("sends the date range in the URL and the API key in a header", async () => {
      const { provider, fetchMock } = setup(jsonResponse({ ipoCalendar: [] }));

      await provider.getIpoCalendar(range);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(String(url)).toBe(
        "https://finnhub.io/api/v1/calendar/ipo?from=2026-10-01&to=2026-10-15",
      );
      expect(init?.headers).toEqual({ "X-Finnhub-Token": "test-key" });
    });

    it("returns mapped IPOs and logs skipped records", async () => {
      const { provider, logger } = setup(jsonResponse(fixture));

      const ipos = await provider.getIpoCalendar(range);

      expect(ipos).toHaveLength(6);
      expect(logger.warn).toHaveBeenCalledWith("[Finnhub] Skipped 2 unusable IPO record(s)");
    });

    it.each([
      [429, "RATE_LIMITED"],
      [401, "UNAUTHORIZED"],
      [403, "UNAUTHORIZED"],
      [500, "UNAVAILABLE"],
    ] as const)("maps HTTP %i to %s", async (status, code) => {
      const { provider } = setup(jsonResponse({ error: "failed" }, status));

      await expect(provider.getIpoCalendar(range)).rejects.toMatchObject({ code });
    });

    it("maps network failures to UNAVAILABLE", async () => {
      const { provider } = setup(new TypeError("fetch failed"));

      await expect(provider.getIpoCalendar(range)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    });

    it("maps unexpected response shapes to BAD_RESPONSE", async () => {
      const { provider } = setup(jsonResponse({ unexpected: true }));

      const error = await provider.getIpoCalendar(range).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ProviderError);
      expect(error).toMatchObject({ code: "BAD_RESPONSE" });
    });
  });

  describe("getQuote", () => {
    it("normalizes the symbol and maps the quote", async () => {
      const { provider, fetchMock } = setup(
        jsonResponse({ c: 15.5, d: 0.5, dp: 3.33, h: 16, l: 15, o: 15.1, pc: 15, t: 1791504000 }),
      );

      const quote = await provider.getQuote(" trxb ");

      expect(String(fetchMock.mock.calls[0]![0])).toBe(
        "https://finnhub.io/api/v1/quote?symbol=TRXB",
      );
      expect(quote).toEqual({
        symbol: "TRXB",
        current: 15.5,
        change: 0.5,
        percentChange: 3.33,
        asOf: "2026-10-09T00:00:00.000Z",
      });
    });

    it("returns null for unknown symbols", async () => {
      const { provider } = setup(
        jsonResponse({ c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 }),
      );

      expect(await provider.getQuote("NOPE")).toBeNull();
    });

    it("returns null for a blank symbol without calling Finnhub", async () => {
      const { provider, fetchMock } = setup(jsonResponse({}));

      expect(await provider.getQuote("   ")).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});