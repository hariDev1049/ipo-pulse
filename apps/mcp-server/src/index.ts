import { createServer as createHttpServer } from "node:http";
import { CachedProvider, FinnhubProvider } from "@ipo-pulse/core";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { loadConfig } from "./config";
import { createServer } from "./server";

const config = loadConfig();
const provider = new CachedProvider(new FinnhubProvider({ apiKey: config.finnhubApiKey }));

const handler = createMcpHandler(() => createServer(provider));
const mcp = toNodeHandler(handler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createHttpServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (pathname !== "/mcp") {
    res.writeHead(404);
    res.end();
    return;
  }

  if (!validateHost(req, res) || !validateOrigin(req, res)) return;
  void mcp(req, res);
});

httpServer.listen(config.port, config.host, () => {
  console.log(`MCP server listening on http://${config.host}:${config.port}/mcp`);
});

async function shutdown() {
  await handler.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);