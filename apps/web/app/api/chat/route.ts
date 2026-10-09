import { groq } from "@ai-sdk/groq";
import { createMCPClient } from "@ai-sdk/mcp";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

const groqApiKey = process.env["GROQ_API_KEY"];
const MCP_SERVER_URL =
  process.env["MCP_SERVER_URL"] ?? "http://127.0.0.1:3001/mcp";
export async function POST(req: Request) {
  if (!groqApiKey) {
    return new Response("GROQ_API_KEY is not set", { status: 500 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
      redirect: "error",
    },
    maxRetries: 2,
  });

  const close = () => mcpClient.close();

  try {
    const tools = await mcpClient.tools();

    const result = streamText({
      model: groq("openai/gpt-oss-120b"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools,
      temperature: 0,
      stopWhen: stepCountIs(8),
      onEnd: close,
      onError({ error }) {
        console.error(error);
        void close();
      },
    });

    return result.toUIMessageStreamResponse({
      onError(error) {
        return error instanceof Error ? error.message : "An error occurred.";
      },
    });
  } catch (error) {
    await close();
    console.error(error);
    return new Response("Failed to generate a response", { status: 500 });
  }
}
