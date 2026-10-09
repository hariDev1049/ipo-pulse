import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/ipo-calendar.json";
import { mapFinnhubIpo, parseFinnhubIpoCalendar } from "./map";

const trexBio = {
  date: "2026-10-09",
  exchange: "NASDAQ Global Select",
  name: "TRex Bio, Inc.",
  numberOfShares: 8333334,
  price: "14.00-16.00",
  status: "expected",
  symbol: "TRXB",
  totalSharesValue: 133333344,
};

describe("mapFinnhubIpo", () => {
  it("maps a complete record", () => {
    expect(mapFinnhubIpo(trexBio)).toEqual({
      date: "2026-10-09",
      symbol: "TRXB",
      name: "TRex Bio, Inc.",
      exchange: "NASDAQ Global Select",
      priceRange: { low: 14, high: 16 },
      shares: 8333334,
      totalValue: 133333344,
      status: "expected",
      isSpac: false,
    });
  });

  it("turns empty strings and zeros into null", () => {
    expect(
      mapFinnhubIpo({
        ...trexBio,
        symbol: "",
        exchange: "  ",
        price: "",
        numberOfShares: 0,
        totalSharesValue: 0,
      }),
    ).toMatchObject({
      symbol: null,
      exchange: null,
      priceRange: null,
      shares: null,
      totalValue: null,
    });
  });

  it("returns a null date when the format is not YYYY-MM-DD", () => {
    expect(mapFinnhubIpo({ ...trexBio, date: "10/09/2026" })?.date).toBeNull();
  });

  it("normalizes status casing", () => {
    expect(mapFinnhubIpo({ ...trexBio, status: "Priced" })?.status).toBe("priced");
  });

  it.each([[null], [""], ["postponed"]])("skips records with status %j", (status) => {
    expect(mapFinnhubIpo({ ...trexBio, status })).toBeNull();
  });

  it.each([[null], [""], ["   "]])("skips records with name %j", (name) => {
    expect(mapFinnhubIpo({ ...trexBio, name })).toBeNull();
  });
});

describe("parseFinnhubIpoCalendar", () => {
  it("maps a full response and drops unusable records", () => {
    const ipos = parseFinnhubIpoCalendar(fixture);

    expect(ipos.map((ipo) => ipo.name)).toEqual([
      "TRex Bio, Inc.",
      "Retension Pharmaceuticals, Inc.",
      "AfterNext Acquisition I Corp.",
      "New Iceland Arctic Acquisition Corp.",
      "Harbor Analytics, Inc.",
      "Northwind Systems, Inc.",
    ]);
    expect(ipos.filter((ipo) => ipo.isSpac).map((ipo) => ipo.name)).toEqual([
      "AfterNext Acquisition I Corp.",
      "New Iceland Arctic Acquisition Corp.",
    ]);
  });

  it("throws when the response is not an IPO calendar", () => {
    expect(() => parseFinnhubIpoCalendar({ error: "Invalid API key" })).toThrow();
  });
});