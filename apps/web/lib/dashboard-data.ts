import "server-only";
import { connection } from "next/server";
import { ProviderError, type Ipo } from "@ipo-pulse/core";
import { addUtcDays, calendarWindow, CHART_LOOKBACK_DAYS, CHART_QUOTE_LIMIT, toUtcDate } from "./dates";
import type { DashboardData, ListingPerformance } from "./dashboard-types";
import { midpoint } from "./format";
import { getProvider } from "./provider";

export type { DashboardData, ListingPerformance } from "./dashboard-types";

function providerMessage(error: ProviderError): string {
  switch (error.code) {
    case "RATE_LIMITED":
      return "Finnhub rate limit exceeded. Try again in a minute.";
    case "UNAUTHORIZED":
      return "Finnhub rejected the API key.";
    case "UNAVAILABLE":
      return "Finnhub is unavailable right now.";
    case "BAD_RESPONSE":
      return "Finnhub returned an unexpected response.";
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  await connection();

  if (!process.env["FINNHUB_API_KEY"]) {
    return { ok: false, message: "FINNHUB_API_KEY is not set." };
  }

  try {
    const provider = getProvider();
    const today = toUtcDate(new Date());
    const window = calendarWindow(today);
    const ipos = await provider.getIpoCalendar(window);

    const recent = ipos
      .filter((ipo) => {
        if (!ipo.date || !ipo.symbol || !ipo.priceRange) return false;
        if (ipo.isSpac || ipo.status !== "priced") return false;
        if (ipo.date >= today) return false;
        return ipo.date >= addUtcDays(today, -CHART_LOOKBACK_DAYS);
      })
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, CHART_QUOTE_LIMIT);

    const performance = (
      await Promise.all(recent.map((ipo) => loadPerformance(provider, ipo)))
    ).filter((row) => row !== null);

    return {
      ok: true,
      source: provider.name,
      asOf: new Date().toISOString(),
      today,
      from: window.from,
      to: window.to,
      ipos,
      performance,
    };
  } catch (error) {
    if (error instanceof ProviderError) {
      return { ok: false, message: providerMessage(error) };
    }
    throw error;
  }
}

async function loadPerformance(
  provider: ReturnType<typeof getProvider>,
  ipo: Ipo,
): Promise<ListingPerformance | null> {
  if (!ipo.symbol || !ipo.priceRange) return null;
  const quote = await provider.getQuote(ipo.symbol);
  if (!quote) return null;
  const ipoPrice = midpoint(ipo.priceRange);
  if (ipoPrice <= 0) return null;
  return {
    symbol: ipo.symbol,
    name: ipo.name,
    ipoPrice,
    current: quote.current,
    changePercent: ((quote.current - ipoPrice) / ipoPrice) * 100,
  };
}
