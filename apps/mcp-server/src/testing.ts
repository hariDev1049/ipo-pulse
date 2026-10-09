import type { IpoDataProvider } from "@ipo-pulse/core";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { onTestFinished } from "vitest";
import { createServer } from "./server";

export const emptyProvider: IpoDataProvider = {
  name: "Fake",
  getIpoCalendar: async () => [],
  getQuote: async () => null,
};

export async function connectClient(provider: IpoDataProvider = emptyProvider): Promise<Client> {
  const handler = createMcpHandler(() => createServer(provider));
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );

  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    }),
  );

  onTestFinished(async () => {
    await client.close();
    await handler.close();
  });

  return client;
}