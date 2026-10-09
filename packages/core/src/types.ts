export const IPO_STATUSES = ["expected", "priced", "filed", "withdrawn"] as const;
export type IpoStatus = (typeof IPO_STATUSES)[number];

export interface PriceRange {
  low: number;
  high: number;
}

export interface Ipo {
  /** YYYY-MM-DD */
  date: string | null;
  symbol: string | null;
  name: string;
  exchange: string | null;
  /** A single offer price is represented as low === high. */
  priceRange: PriceRange | null;
  shares: number | null;
  totalValue: number | null;
  status: IpoStatus;
  /** Heuristic, not an official flag. See isLikelySpac. */
  isSpac: boolean;
}

export interface Quote {
  symbol: string;
  current: number;
  change: number;
  percentChange: number;
  /** ISO 8601 timestamp */
  asOf: string;
}

export interface DateRange {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

export interface IpoDataProvider {
  readonly name: string;
  getIpoCalendar(range: DateRange): Promise<Ipo[]>;
  /** Resolves to null when the symbol has no quote. */
  getQuote(symbol: string): Promise<Quote | null>;
}