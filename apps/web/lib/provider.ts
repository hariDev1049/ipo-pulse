import "server-only";
import { CachedProvider, FinnhubProvider } from "@ipo-pulse/core";

let cached: CachedProvider | null = null;

export function getProvider(): CachedProvider {
  const apiKey = process.env["FINNHUB_API_KEY"];
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set");
  }

  cached ??= new CachedProvider(new FinnhubProvider({ apiKey }));
  return cached;
}
