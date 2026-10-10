import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
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

function hasValidBearer(header: string | undefined, secret: string): boolean {
  const prefix = "Bearer ";
  if (!header?.startsWith(prefix)) return false;
  const got = Buffer.from(header.slice(prefix.length));
  const want = Buffer.from(secret);
  if (got.length !== want.length) return false;
  return timingSafeEqual(got, want);
}

function authorize(req: IncomingMessage, res: ServerResponse): boolean {
  if (config.sharedSecret) {
    if (hasValidBearer(req.headers.authorization, config.sharedSecret)) return true;
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return false;
  }

  return validateHost(req, res) && validateOrigin(req, res);
}

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

  if (!authorize(req, res)) return;
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
