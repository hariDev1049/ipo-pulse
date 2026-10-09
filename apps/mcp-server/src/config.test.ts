import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("applies defaults for host and port", () => {
    expect(loadConfig({ FINNHUB_API_KEY: "key" })).toEqual({
      finnhubApiKey: "key",
      host: "127.0.0.1",
      port: 3001,
    });
  });

  it("reads the port as a number", () => {
    expect(loadConfig({ FINNHUB_API_KEY: "key", MCP_PORT: "4000" }).port).toBe(4000);
  });

  it("fails fast without an API key", () => {
    expect(() => loadConfig({})).toThrow(/FINNHUB_API_KEY/);
  });
});