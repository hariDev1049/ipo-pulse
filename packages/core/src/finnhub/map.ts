import { IPO_STATUSES, type Ipo, type IpoStatus } from "../types";
import { isLikelySpac, parsePriceRange } from "./parse";
import { finnhubIpoCalendarSchema, type FinnhubIpo } from "./schemas";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toPositiveNumber(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

function toIsoDate(value: string | null | undefined): string | null {
  const text = toText(value);
  return text && ISO_DATE_PATTERN.test(text) ? text : null;
}

function isIpoStatus(value: string): value is IpoStatus {
  return (IPO_STATUSES as readonly string[]).includes(value);
}

export function mapFinnhubIpo(raw: FinnhubIpo): Ipo | null {
  const name = toText(raw.name);
  const status = toText(raw.status)?.toLowerCase();
  if (!name || !status || !isIpoStatus(status)) return null;

  const symbol = toText(raw.symbol);
  const priceRange = parsePriceRange(raw.price);

  return {
    date: toIsoDate(raw.date),
    symbol,
    name,
    exchange: toText(raw.exchange),
    priceRange,
    shares: toPositiveNumber(raw.numberOfShares),
    totalValue: toPositiveNumber(raw.totalSharesValue),
    status,
    isSpac: isLikelySpac({ name, symbol, priceRange }),
  };
}

export function parseFinnhubIpoCalendar(json: unknown): Ipo[] {
  const { ipoCalendar } = finnhubIpoCalendarSchema.parse(json);
  return ipoCalendar.map(mapFinnhubIpo).filter((ipo) => ipo !== null);
}