import type { IpoDataProvider } from "@ipo-pulse/core";
import { McpServer } from "@modelcontextprotocol/server";

export const SERVER_NAME = "ipo-pulse";

export function createServer(provider: IpoDataProvider): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: "0.1.0" });
  return server;
}