import { z } from "zod";

const envSchema = z.object({
  FINNHUB_API_KEY: z.string().min(1, "FINNHUB_API_KEY is required"),
  MCP_HOST: z.string().default("127.0.0.1"),
  MCP_PORT: z.coerce.number().int().positive().default(3001),
  PORT: z.coerce.number().int().positive().optional(),
  MCP_SHARED_SECRET: z.string().min(1).optional(),
});

export interface Config {
  finnhubApiKey: string;
  host: string;
  port: number;
  sharedSecret: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return {
    finnhubApiKey: result.data.FINNHUB_API_KEY,
    host: result.data.MCP_HOST,
    port: result.data.PORT ?? result.data.MCP_PORT,
    sharedSecret: result.data.MCP_SHARED_SECRET,
  };
}
