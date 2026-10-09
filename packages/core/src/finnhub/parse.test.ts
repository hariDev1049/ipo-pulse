import { describe, expect, it } from "vitest";
import { isLikelySpac, parsePriceRange } from "./parse";

describe("parsePriceRange", () => {
  it.each([
    ["14.00-16.00", { low: 14, high: 16 }],
    ["10.00", { low: 10, high: 10 }],
    [" 14.00 - 16.00 ", { low: 14, high: 16 }],
    ["16.00-14.00", { low: 14, high: 16 }],
  ])("parses %j", (raw, expected) => {
    expect(parsePriceRange(raw)).toEqual(expected);
  });

  it.each([[""], ["   "], [null], [undefined], ["TBD"], ["0"], ["14.00-"], ["14-16-18"]])(
    "returns null for %j",
    (raw) => {
      expect(parsePriceRange(raw)).toBeNull();
    },
  );
});

describe("isLikelySpac", () => {
  it("flags names containing 'Acquisition'", () => {
    expect(
      isLikelySpac({
        name: "AfterNext Acquisition I Corp.",
        symbol: "AFNXU",
        priceRange: { low: 10, high: 10 },
      }),
    ).toBe(true);
  });

  it("flags names containing 'Acquisition' even without symbol or price", () => {
    expect(
      isLikelySpac({ name: "New Iceland Arctic Acquisition Corp.", symbol: null, priceRange: null }),
    ).toBe(true);
  });

  it("flags $10.00 unit offerings even without 'Acquisition' in the name", () => {
    expect(
      isLikelySpac({ name: "Blue Ocean Capital Corp.", symbol: "BOCCU", priceRange: { low: 10, high: 10 } }),
    ).toBe(true);
  });

  it("does not flag a regular IPO", () => {
    expect(
      isLikelySpac({ name: "TRex Bio, Inc.", symbol: "TRXB", priceRange: { low: 14, high: 16 } }),
    ).toBe(false);
  });

  it("does not flag a regular IPO priced at $10.00", () => {
    expect(
      isLikelySpac({ name: "Acme Robotics, Inc.", symbol: "ACMR", priceRange: { low: 10, high: 10 } }),
    ).toBe(false);
  });
});