import type { Ipo } from "@ipo-pulse/core";

export interface ListingPerformance {
  symbol: string;
  name: string;
  ipoPrice: number;
  current: number;
  changePercent: number;
}

export type DashboardData =
  | {
      ok: true;
      source: string;
      asOf: string;
      today: string;
      from: string;
      to: string;
      ipos: Ipo[];
      performance: ListingPerformance[];
    }
  | {
      ok: false;
      message: string;
    };
