import { describe, expect, it } from "vitest";
import { SERVER_NAME } from "./server";
import { connectClient } from "./testing";

describe("MCP server", () => {
  it("connects and identifies itself", async () => {
    const client = await connectClient();

    expect(client.getServerVersion()?.name).toBe(SERVER_NAME);
  });
});