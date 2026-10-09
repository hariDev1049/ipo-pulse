import { z } from "zod";

export const finnhubIpoSchema = z.object({
  date: z.string().nullish(),
  exchange: z.string().nullish(),
  name: z.string().nullish(),
  numberOfShares: z.number().nullish(),
  price: z.string().nullish(),
  status: z.string().nullish(),
  symbol: z.string().nullish(),
  totalSharesValue: z.number().nullish(),
});

export const finnhubIpoCalendarSchema = z.object({
  ipoCalendar: z.array(finnhubIpoSchema),
});

export const finnhubQuoteSchema = z.object({
  c: z.number(),
  d: z.number().nullable(),
  dp: z.number().nullable(),
  t: z.number(),
});

export type FinnhubIpo = z.infer<typeof finnhubIpoSchema>;
export type FinnhubQuote = z.infer<typeof finnhubQuoteSchema>;