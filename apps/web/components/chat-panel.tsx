"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
} from "ai";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MarkdownText } from "./markdown-text";
import { ToolCard } from "./tool-card";

const SUGGESTIONS = [
  "Which IPOs open this week? Cite the source and date.",
  "What is the price range and share count for TRex Bio?",
  "How have last month's priced IPOs performed since listing?",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function ChatPanel() {
  const { messages, sendMessage, status, error, stop } = useChat({
    id: "ipo-pulse",
    transport,
  });
  const [input, setInput] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-t border-border bg-card lg:border-t-0"
      aria-labelledby="chat-heading"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 id="chat-heading" className="text-sm font-semibold">
          Ask IPO Pulse
        </h2>
        <p className="mt-1 text-xs text-muted">
          Answers come from MCP tools on Finnhub, not model memory.
        </p>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Try a grounded question:</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={busy}
                onClick={() => void sendMessage({ text: suggestion })}
                className="rounded-lg border border-border bg-zinc-900 px-3 py-2 text-left text-xs text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {message.role === "user" ? "You" : "IPO Pulse"}
                </p>
                {message.parts.map((part, index) => {
                  if (isTextUIPart(part) && part.text) {
                    return message.role === "user" ? (
                      <p key={index} className="text-sm text-zinc-100">
                        {part.text}
                      </p>
                    ) : (
                      <MarkdownText key={index} text={part.text} />
                    );
                  }
                  if (isToolUIPart(part)) {
                    return (
                      <ToolCard
                        key={part.toolCallId}
                        name={getToolName(part)}
                        part={part}
                      />
                    );
                  }
                  if (isReasoningUIPart(part) && part.text) {
                    return (
                      <details key={index} className="text-xs text-muted">
                        <summary className="cursor-pointer">Reasoning</summary>
                        <p className="mt-1 whitespace-pre-wrap">{part.text}</p>
                      </details>
                    );
                  }
                  return null;
                })}
              </li>
            ))}
          </ol>
        )}
        {error ? (
          <p role="alert" className="mt-3 text-xs text-down">
            {error.message}
          </p>
        ) : null}
        {busy ? (
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            {status === "submitted" ? "Sending…" : "Streaming…"}
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-3">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about upcoming IPOs…"
          className="w-full resize-none rounded-lg border border-border bg-zinc-950 px-3 py-2 text-sm text-foreground placeholder:text-zinc-600"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted">Enter to send · Shift+Enter for a new line</p>
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
