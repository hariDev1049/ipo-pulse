import type { IpoDataProvider } from "@ipo-pulse/core";
import { McpServer } from "@modelcontextprotocol/server";
import { registerTools } from "./tools";

export const SERVER_NAME = "ipo-pulse";

export function createServer(provider: IpoDataProvider, options?: { now?: () => Date }): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: "0.1.0" });
  registerTools(server, provider, options?.now ?? (() => new Date()));
  return server;
}