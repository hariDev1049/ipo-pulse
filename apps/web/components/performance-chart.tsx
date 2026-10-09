import { formatPercent } from "@/lib/format";
import type { ListingPerformance } from "@/lib/dashboard-types";

export function PerformanceChart({ rows }: { rows: ListingPerformance[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted">
        No recent priced IPOs with a live quote. Newly listed names often have no
        Finnhub quote yet.
      </p>
    );
  }

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.changePercent)), 1);
  const summary = rows
    .map((row) => `${row.symbol} ${formatPercent(row.changePercent)}`)
    .join(", ");

  return (
    <figure>
      <figcaption className="sr-only">
        Listing performance versus IPO midpoint for {rows.length} recent names:{" "}
        {summary}
      </figcaption>
      <ul className="flex flex-col gap-2" aria-hidden="true">
        {rows.map((row) => {
          const positive = row.changePercent >= 0;
          const width = `${((Math.abs(row.changePercent) / maxAbs) * 50).toFixed(1)}%`;
          return (
            <li key={row.symbol} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2">
              <span className="font-mono text-xs text-zinc-300">{row.symbol}</span>
              <div className="relative h-6 rounded bg-zinc-800/80">
                <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
                <div
                  className={`absolute inset-y-1 rounded-sm ${positive ? "left-1/2 bg-up" : "right-1/2 bg-down"}`}
                  style={{ width }}
                />
              </div>
              <span className={`text-right font-mono text-xs ${positive ? "text-up" : "text-down"}`}>
                {formatPercent(row.changePercent)}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
