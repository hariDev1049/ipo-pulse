export const CALENDAR_LOOKBACK_DAYS = 365;
export const CALENDAR_LOOKAHEAD_DAYS = 180;
export const CHART_LOOKBACK_DAYS = 30;
export const CHART_QUOTE_LIMIT = 12;

/** UTC calendar date as YYYY-MM-DD. Finnhub dates have no timezone. */
export function toUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarWindow(today: string): { from: string; to: string } {
  return {
    from: addUtcDays(today, -CALENDAR_LOOKBACK_DAYS),
    to: addUtcDays(today, CALENDAR_LOOKAHEAD_DAYS),
  };
}
