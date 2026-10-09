"use client";

import type { ReactNode } from "react";
import type { Ipo, IpoStatus } from "@ipo-pulse/core";
import { addUtcDays, CHART_LOOKBACK_DAYS } from "@/lib/dates";
import { formatUsdCompact, formatYearMonth } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import type { ListingPerformance } from "@/lib/dashboard-types";
import { AnimatedNumber } from "./animated-number";
import { PerformanceChart } from "./performance-chart";

const STATUS_COLORS: Record<IpoStatus, string> = {
  expected: "#fbbf24",
  priced: "#34d399",
  filed: "#38bdf8",
  withdrawn: "#71717a",
};

const EXCHANGE_COLORS: Record<string, string> = {
  NASDAQ: "#2dd4bf",
  NYSE: "#818cf8",
  Other: "#a1a1aa",
  Unknown: "#52525b",
};

export function DashboardOverview({
  ipos,
  today,
  performance,
}: {
  ipos: Ipo[];
  today: string;
  performance: ListingPerformance[];
}) {
  const upcoming = ipos.filter(
    (ipo) =>
      ipo.date &&
      ipo.date >= today &&
      (ipo.status === "expected" || ipo.status === "priced"),
  ).length;
  const listed30 = ipos.filter(
    (ipo) =>
      ipo.date &&
      ipo.date < today &&
      ipo.date >= addUtcDays(today, -CHART_LOOKBACK_DAYS) &&
      ipo.status === "priced",
  ).length;
  const disclosedValue = ipos.reduce((sum, ipo) => sum + (ipo.totalValue ?? 0), 0);
  const filed = ipos.filter((ipo) => ipo.status === "filed").length;
  const motionKey = `${ipos.length}-${disclosedValue}-${upcoming}-${filed}`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={upcoming}
          format={(n) => String(Math.round(n))}
          hint="Expected or priced, date ≥ today"
        />
        <StatCard
          label="Priced last 30d"
          value={listed30}
          format={(n) => String(Math.round(n))}
          hint="Already listed in the last 30 days"
        />
        <StatCard
          label="Disclosed value"
          value={disclosedValue}
          format={(n) => formatUsdCompact(n)}
          hint="Sum of offering value when Finnhub has it"
        />
        <StatCard
          label="Filed"
          value={filed}
          format={(n) => String(Math.round(n))}
          hint="Registrations, often incomplete"
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Deals by month"
          hint="Count of calendar rows in the selected date range"
        >
          <MonthlyChart key={`count-${motionKey}`} ipos={ipos} metric="count" />
        </ChartCard>
        <ChartCard
          title="Disclosed value by month"
          hint="Sum of offering value. Months with only filed/withdrawn names are often $0."
        >
          <MonthlyChart key={`value-${motionKey}`} ipos={ipos} metric="value" />
        </ChartCard>
        <ChartCard title="Status mix" hint="Same window. Withdrawn stays visible here so the pipeline is honest.">
          <StatusDonut key={`status-${motionKey}`} ipos={ipos} />
        </ChartCard>
        <ChartCard
          title="Exchange mix"
          hint="NASDAQ / NYSE rolled up from Finnhub’s venue strings"
        >
          <ExchangeBars key={`exch-${motionKey}`} ipos={ipos} />
        </ChartCard>
        <ChartCard
          title="Listing performance (last 30 days)"
          hint="Live quote vs IPO midpoint. Independent of the table tabs. SPACs excluded at fetch time."
          className="lg:col-span-2"
        >
          <PerformanceChart key={`perf-${motionKey}`} rows={performance} />
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  format,
  hint,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  hint: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums text-foreground">
        <AnimatedNumber value={value} format={format} />
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </article>
  );
}

function ChartCard({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mb-4 mt-1 text-xs text-muted">{hint}</p>
      {children}
    </section>
  );
}

function MonthlyChart({ ipos, metric }: { ipos: Ipo[]; metric: "count" | "value" }) {
  const dated = ipos.filter((ipo) => ipo.date);
  if (dated.length === 0) {
    return <p className="text-sm text-muted">No dated offerings in this range.</p>;
  }

  const totals = new Map<string, number>();
  for (const ipo of dated) {
    const key = ipo.date!.slice(0, 7);
    const amount = metric === "count" ? 1 : (ipo.totalValue ?? 0);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  const months = [...totals.keys()].sort();
  const max = Math.max(...totals.values(), 1);

  return (
    <figure>
      <figcaption className="sr-only">
        {metric === "count" ? "IPO counts" : "Disclosed offering value"} by month:{" "}
        {months
          .map((month) =>
            metric === "count"
              ? `${formatYearMonth(month)} ${totals.get(month)}`
              : `${formatYearMonth(month)} ${formatUsdCompact(totals.get(month) ?? 0)}`,
          )
          .join(", ")}
      </figcaption>
      <div className="flex h-40 min-w-0 items-end gap-1 overflow-hidden" aria-hidden="true">
        {months.map((month, index) => (
          <MonthlyColumn
            key={month}
            amount={totals.get(month) ?? 0}
            max={max}
            metric={metric}
            month={month}
            delayMs={index * 40}
          />
        ))}
      </div>
    </figure>
  );
}

function MonthlyColumn({
  amount,
  max,
  metric,
  month,
  delayMs,
}: {
  amount: number;
  max: number;
  metric: "count" | "value";
  month: string;
  delayMs: number;
}) {
  const shown = useCountUp(amount, 900, delayMs);
  const height = `${max > 0 ? (shown / max) * 100 : 0}%`;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span className="max-w-full truncate text-[10px] tabular-nums text-zinc-400">
        {amount
          ? metric === "count"
            ? String(Math.round(shown))
            : formatUsdCompact(shown)
          : null}
      </span>
      <div className="flex h-28 w-full items-end justify-center">
        <div
          className={`w-[70%] rounded-t ${metric === "count" ? "bg-accent/80" : "bg-sky-400/80"}`}
          style={{ height }}
        />
      </div>
      <span className="w-full truncate text-center text-[10px] text-muted">
        {formatYearMonth(month)}
      </span>
    </div>
  );
}

function StatusDonut({ ipos }: { ipos: Ipo[] }) {
  const statuses: IpoStatus[] = ["expected", "priced", "filed", "withdrawn"];
  const slices = statuses.map((status) => ({
    status,
    count: ipos.filter((ipo) => ipo.status === status).length,
  }));
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total === 0) {
    return <p className="text-sm text-muted">No rows in this range.</p>;
  }

  return <StatusDonutChart slices={slices} total={total} />;
}

function StatusDonutChart({
  slices,
  total,
}: {
  slices: { status: IpoStatus; count: number }[];
  total: number;
}) {
  const progress = useCountUp(1, 900);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-6 overflow-hidden">
      <svg viewBox="0 0 96 96" className="size-32 shrink-0" role="img" aria-label="IPO status mix">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#27272a" strokeWidth="12" />
        {slices.map((slice) => {
          if (slice.count === 0) return null;
          const fullDash = (slice.count / total) * circumference;
          const dash = fullDash * progress;
          const circle = (
            <circle
              key={slice.status}
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={STATUS_COLORS[slice.status]}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 48 48)"
            />
          );
          offset += fullDash;
          return circle;
        })}
        <text
          x="48"
          y="48"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          fontSize="14"
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(total * progress)}
        </text>
      </svg>
      <ul className="flex min-w-0 flex-col gap-1.5 text-xs">
        {slices.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2 capitalize">
            <span
              className="size-2.5 rounded-full"
              style={{ background: STATUS_COLORS[slice.status] }}
              aria-hidden="true"
            />
            <span className="w-20 text-muted">{slice.status}</span>
            <span className="font-mono text-zinc-300">{Math.round(slice.count * progress)}</span>
            <span className="text-muted">{share(slice.count, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExchangeBars({ ipos }: { ipos: Ipo[] }) {
  const counts = new Map<string, number>();
  for (const ipo of ipos) {
    const bucket = exchangeBucket(ipo.exchange);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  const rows = ["NASDAQ", "NYSE", "Other", "Unknown"]
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .filter((row) => row.count > 0);
  const max = Math.max(...rows.map((row) => row.count), 1);
  const total = ipos.length || 1;

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No rows in this range.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <ExchangeRow
          key={row.name}
          name={row.name}
          count={row.count}
          max={max}
          total={total}
          delayMs={index * 80}
        />
      ))}
    </ul>
  );
}

function ExchangeRow({
  name,
  count,
  max,
  total,
  delayMs,
}: {
  name: string;
  count: number;
  max: number;
  total: number;
  delayMs: number;
}) {
  const shown = useCountUp(count, 900, delayMs);

  return (
    <li className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-xs">
      <span className="text-muted">{name}</span>
      <div className="h-5 overflow-hidden rounded bg-zinc-800/80">
        <div
          className="h-5 rounded"
          style={{
            width: `${max > 0 ? (shown / max) * 100 : 0}%`,
            background: EXCHANGE_COLORS[name],
          }}
        />
      </div>
      <span className="text-right font-mono text-zinc-300">
        {Math.round(shown)}
        <span className="ml-1 text-muted">{share(count, total)}</span>
      </span>
    </li>
  );
}

function share(count: number, total: number): string {
  return `${((count / total) * 100).toFixed(0)}%`;
}

function exchangeBucket(exchange: string | null): string {
  if (!exchange) return "Unknown";
  const value = exchange.toUpperCase();
  if (value.includes("NASDAQ")) return "NASDAQ";
  if (value.includes("NYSE")) return "NYSE";
  return "Other";
}
