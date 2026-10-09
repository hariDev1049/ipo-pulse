"use client";

import { useState } from "react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { formatIsoDate, formatPercent, formatPriceRange, formatUsd } from "@/lib/format";
import { JsonPreview } from "./markdown-text";

type ToolPart = ToolUIPart | DynamicToolUIPart;

const TOOL_LABELS: Record<string, string> = {
  get_upcoming_ipos: "Upcoming IPOs",
  get_recent_ipos: "Recent IPOs",
  get_ipo_details: "IPO details",
  get_listing_performance: "Listing performance",
};

export function ToolCard({ name, part }: { name: string; part: ToolPart }) {
  const [open, setOpen] = useState(part.state !== "output-available");
  const title = part.title ?? TOOL_LABELS[name] ?? name;
  const payload = extractPayload(part);
  const summary = summarize(name, part, payload);

  return (
    <article className="rounded-lg border border-border bg-zinc-900/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot state={part.state} />
          <span className="truncate text-xs font-medium">{title}</span>
        </span>
        <span className="shrink-0 text-[11px] text-muted">{summary}</span>
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2">
          <ToolBody name={name} part={part} payload={payload} />
        </div>
      ) : null}
    </article>
  );
}

function StatusDot({ state }: { state: ToolPart["state"] }) {
  const running = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error" || state === "output-denied";
  return (
    <span
      className={`size-1.5 rounded-full ${
        failed ? "bg-down" : running ? "animate-pulse bg-amber-400" : "bg-up"
      }`}
      aria-hidden="true"
    />
  );
}

function ToolBody({
  name,
  part,
  payload,
}: {
  name: string;
  part: ToolPart;
  payload: unknown;
}) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <p className="text-xs text-muted">
        Calling {name}
        {part.input ? ` with ${JSON.stringify(part.input)}` : "…"}
      </p>
    );
  }
  if (part.state === "output-error") {
    return <p className="text-xs text-down">{part.errorText}</p>;
  }
  if (part.state === "output-denied") {
    return <p className="text-xs text-muted">Tool call denied.</p>;
  }
  if (isErrorPayload(payload)) {
    return <p className="text-xs text-down">{payload.message}</p>;
  }
  if (isIpoList(payload)) {
    return <IpoMiniTable ipos={payload.ipos} source={payload.source} asOf={payload.asOf} />;
  }
  if (isPerformance(payload)) {
    return (
      <p className="text-xs text-zinc-300">
        {payload.symbol}
        {payload.name ? ` · ${payload.name}` : ""} · IPO {formatUsd(payload.ipoPrice)} →{" "}
        {formatUsd(payload.current)} ({formatPercent(payload.changePercent)}) · {payload.source}
      </p>
    );
  }
  return <JsonPreview value={payload ?? part.output} />;
}

function IpoMiniTable({
  ipos,
  source,
  asOf,
}: {
  ipos: MiniIpo[];
  source: string;
  asOf: string;
}) {
  if (ipos.length === 0) {
    return <p className="text-xs text-muted">No rows from {source}.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted">
        {source}
        {asOf ? ` · ${asOf}` : ""}
      </p>
      <table className="w-full text-left text-[11px]">
        <thead className="text-muted">
          <tr>
            <th className="py-1 font-medium">Date</th>
            <th className="py-1 font-medium">Symbol</th>
            <th className="py-1 font-medium">Name</th>
            <th className="py-1 font-medium">Range</th>
          </tr>
        </thead>
        <tbody>
          {ipos.slice(0, 8).map((ipo, index) => (
            <tr key={`${ipo.symbol ?? ipo.name}-${index}`} className="border-t border-border/80">
              <td className="py-1">{formatIsoDate(ipo.date)}</td>
              <td className="py-1 font-mono">{ipo.symbol ?? "—"}</td>
              <td className="py-1">{ipo.name}</td>
              <td className="py-1">{formatPriceRange(ipo.priceRange)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ipos.length > 8 ? (
        <p className="text-[11px] text-muted">{ipos.length - 8} more in the model context</p>
      ) : null}
    </div>
  );
}

function summarize(name: string, part: ToolPart, payload: unknown): string {
  if (part.state === "input-streaming") return "preparing";
  if (part.state === "input-available") return "running";
  if (part.state === "output-error") return "error";
  if (part.state === "output-denied") return "denied";
  if (isIpoList(payload)) return `${payload.ipos.length} names`;
  if (isPerformance(payload) && payload.changePercent != null) {
    return formatPercent(payload.changePercent);
  }
  return name;
}

function extractPayload(part: ToolPart): unknown {
  if (part.state !== "output-available") return undefined;
  const output = part.output;
  if (output && typeof output === "object") {
    if ("structuredContent" in output && output.structuredContent != null) {
      return output.structuredContent;
    }
    if ("isError" in output && output.isError === true) {
      const content = "content" in output ? output.content : null;
      if (Array.isArray(content) && content[0] && typeof content[0] === "object" && "text" in content[0]) {
        return { message: String(content[0].text) };
      }
      return { message: "Tool returned an error." };
    }
  }
  return output;
}

interface MiniIpo {
  date: string | null;
  symbol: string | null;
  name: string;
  priceRange: { low: number; high: number } | null;
}

function isIpoList(
  value: unknown,
): value is { source: string; asOf: string; ipos: MiniIpo[] } {
  if (!value || typeof value !== "object") return false;
  return "ipos" in value && Array.isArray(value.ipos);
}

function isPerformance(
  value: unknown,
): value is {
  source: string;
  symbol: string;
  name: string | null;
  ipoPrice: number | null;
  current: number | null;
  changePercent: number | null;
} {
  if (!value || typeof value !== "object") return false;
  return "symbol" in value && "ipoPrice" in value && "current" in value;
}

function isErrorPayload(value: unknown): value is { message: string } {
  return !!value && typeof value === "object" && "message" in value && !("ipos" in value);
}
