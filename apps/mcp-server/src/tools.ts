import { IPO_STATUSES, ProviderError, type Ipo, type IpoDataProvider } from "@ipo-pulse/core";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { addUtcDays, calendarWindow, MAX_TOOL_DAYS, toUtcDate } from "./dates";

const MAX_DETAILS = 5;

const ipoSchema = z.object({
  date: z.string().nullable(),
  symbol: z.string().nullable(),
  name: z.string(),
  exchange: z.string().nullable(),
  priceRange: z.object({ low: z.number(), high: z.number() }).nullable(),
  shares: z.number().nullable(),
  totalValue: z.number().nullable(),
  status: z.enum(IPO_STATUSES),
  isSpac: z.boolean(),
});

const listOutputSchema = z.object({
  source: z.string(),
  asOf: z.string(),
  ipos: z.array(ipoSchema),
});

const performanceOutputSchema = z.object({
  source: z.string(),
  asOf: z.string(),
  symbol: z.string(),
  name: z.string().nullable(),
  ipoPrice: z.number().nullable(),
  current: z.number().nullable(),
  changePercent: z.number().nullable(),
});

function daysInput(defaultDays: number) {
  return z.object({
    days: z
      .number()
      .int()
      .min(1)
      .max(MAX_TOOL_DAYS)
      .default(defaultDays)
      .describe(`How many days from today to include. Defaults to ${defaultDays}. Maximum ${MAX_TOOL_DAYS}.`),
    includeSpacs: z
      .boolean()
      .default(false)
      .describe("Include blank-check SPACs. Hidden by default because they dominate the calendar and have no operating business."),
  });
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function ok<T extends Record<string, unknown>>(data: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

function providerErrorMessage(error: ProviderError): string {
  switch (error.code) {
    case "RATE_LIMITED":
      return "The IPO data provider is rate-limited. Try again in a minute.";
    case "UNAUTHORIZED":
      return "The IPO data provider rejected the API key.";
    case "UNAVAILABLE":
      return "The IPO data provider is unavailable right now.";
    case "BAD_RESPONSE":
      return "The IPO data provider returned an unexpected response.";
  }
}

type ToolResult = ReturnType<typeof ok> | ReturnType<typeof fail>;

async function runTool(load: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ProviderError) return fail(providerErrorMessage(error));
    throw error;
  }
}

async function loadCalendar(provider: IpoDataProvider, today: string): Promise<Ipo[]> {
  return provider.getIpoCalendar(calendarWindow(today));
}

function midpoint(range: { low: number; high: number }): number {
  return (range.low + range.high) / 2;
}

function isUpcomingStatus(status: Ipo["status"]): boolean {
  return status === "expected" || status === "priced";
}

export function registerTools(server: McpServer, provider: IpoDataProvider, now: () => Date): void {
  server.registerTool(
    "get_upcoming_ipos",
    {
      title: "Upcoming IPOs",
      description:
        "List US IPOs scheduled from today through the next N days (default 14). Includes expected and already-priced offerings that have not listed yet. SPACs are hidden unless includeSpacs is true. Use for questions like 'which IPOs open this week?'.",
      inputSchema: daysInput(14),
      outputSchema: listOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ days, includeSpacs }) =>
      runTool(async () => {
        const today = toUtcDate(now());
        const end = addUtcDays(today, days);
        const ipos = [...(await loadCalendar(provider, today))]
          .filter((ipo) => {
            if (!ipo.date || ipo.date < today || ipo.date > end) return false;
            if (!isUpcomingStatus(ipo.status)) return false;
            if (!includeSpacs && ipo.isSpac) return false;
            return true;
          })
          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

        return ok({ source: provider.name, asOf: now().toISOString(), ipos });
      }),
  );

  server.registerTool(
    "get_recent_ipos",
    {
      title: "Recent IPOs",
      description:
        "List US IPOs that have already priced in the past N days (default 30), excluding today. SPACs are hidden unless includeSpacs is true. Use for questions like 'how have last month's IPOs done?'. Pair with get_listing_performance for a specific ticker.",
      inputSchema: daysInput(30),
      outputSchema: listOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ days, includeSpacs }) =>
      runTool(async () => {
        const today = toUtcDate(now());
        const start = addUtcDays(today, -days);
        const ipos = [...(await loadCalendar(provider, today))]
          .filter((ipo) => {
            if (!ipo.date || ipo.date >= today || ipo.date < start) return false;
            if (ipo.status !== "priced") return false;
            if (!includeSpacs && ipo.isSpac) return false;
            return true;
          })
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

        return ok({ source: provider.name, asOf: now().toISOString(), ipos });
      }),
  );

  server.registerTool(
    "get_ipo_details",
    {
      title: "IPO details",
      description:
        "Look up one or more US IPOs by ticker symbol or company name. Searches expected, priced, filed, and withdrawn offerings in a one-year lookback and six-month lookahead window. Use for questions like 'what is the price range and share count for TRex Bio?'.",
      inputSchema: z.object({
        query: z.string().min(1).describe("Ticker symbol or company name, for example TRXB or TRex Bio"),
      }),
      outputSchema: listOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ query }) =>
      runTool(async () => {
        const today = toUtcDate(now());
        const needle = query.trim().toLowerCase();
        const ipos = [...(await loadCalendar(provider, today))]
          .filter((ipo) => {
            const symbol = ipo.symbol?.toLowerCase();
            return symbol === needle || ipo.name.toLowerCase().includes(needle);
          })
          .sort((a, b) => {
            const aExact = a.symbol?.toLowerCase() === needle ? 0 : 1;
            const bExact = b.symbol?.toLowerCase() === needle ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            return (b.date ?? "").localeCompare(a.date ?? "");
          })
          .slice(0, MAX_DETAILS);

        return ok({ source: provider.name, asOf: now().toISOString(), ipos });
      }),
  );

  server.registerTool(
    "get_listing_performance",
    {
      title: "Listing performance",
      description:
        "Compare a US IPO's offer price (the midpoint when only a range is known) with its current market quote and percent change since listing. Returns null price fields when the IPO or a quote cannot be found. Use for questions like 'how has ticker X performed since listing?'.",
      inputSchema: z.object({
        symbol: z.string().min(1).describe("Ticker symbol, for example HRBR"),
      }),
      outputSchema: performanceOutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ symbol }) =>
      runTool(async () => {
        const today = toUtcDate(now());
        const normalized = symbol.trim().toUpperCase();
        const matches = [...(await loadCalendar(provider, today))].filter(
          (ipo) => ipo.symbol?.toUpperCase() === normalized,
        );
        const ipo = matches.sort((a, b) => {
          if (a.status === "priced" && b.status !== "priced") return -1;
          if (b.status === "priced" && a.status !== "priced") return 1;
          return (b.date ?? "").localeCompare(a.date ?? "");
        })[0];

        if (!ipo) {
          const window = calendarWindow(today);
          return fail(
            `No IPO found for symbol "${normalized}" between ${window.from} and ${window.to}.`,
          );
        }

        const ipoPrice = ipo.priceRange ? midpoint(ipo.priceRange) : null;
        const quote = await provider.getQuote(normalized);

        return ok({
          source: provider.name,
          asOf: quote?.asOf ?? now().toISOString(),
          symbol: normalized,
          name: ipo.name,
          ipoPrice,
          current: quote?.current ?? null,
          changePercent:
            ipoPrice != null && quote != null ? ((quote.current - ipoPrice) / ipoPrice) * 100 : null,
        });
      }),
  );
}