import type { Ipo, PriceRange } from "../types";

export function parsePriceRange(raw: string | null | undefined): PriceRange | null {
  if (!raw) return null;

  const parts = raw.split("-").map((part) => Number(part.trim()));
  if (parts.length > 2) return null;
  if (parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;

  return { low: Math.min(...parts), high: Math.max(...parts) };
}

const SPAC_NAME_PATTERN = /\bacquisition\b/i;
const SPAC_UNIT_PRICE = 10;

/**
 * Finnhub has no SPAC flag. SPACs usually have "Acquisition" in the name, or
 * list as $10.00 units whose symbol ends in "U". Expect rare false positives.
 */
export function isLikelySpac(ipo: Pick<Ipo, "name" | "symbol" | "priceRange">): boolean {
  if (SPAC_NAME_PATTERN.test(ipo.name)) return true;

  const isUnitPrice =
    ipo.priceRange?.low === SPAC_UNIT_PRICE && ipo.priceRange.high === SPAC_UNIT_PRICE;
  const isUnitSymbol = ipo.symbol?.endsWith("U") ?? false;
  return isUnitPrice && isUnitSymbol;
}