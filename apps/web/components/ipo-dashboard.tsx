"use client";

import { useMemo, useState } from "react";
import type { Ipo, IpoStatus } from "@ipo-pulse/core";
import type { DashboardData } from "@/lib/dashboard-types";
import {
  formatIsoDate,
  formatIsoTimestamp,
  formatPriceRange,
  formatShares,
  formatUsdCompact,
} from "@/lib/format";
import { DashboardOverview } from "./dashboard-charts";
import { StatusBadge } from "./status-badge";

type View = "upcoming" | "recent" | "all";

const ALL_STATUSES: IpoStatus[] = ["expected", "priced", "filed", "withdrawn"];
const DEFAULT_STATUSES: IpoStatus[] = ["expected", "priced", "filed"];

export function IpoDashboard({ data }: { data: DashboardData }) {
  if (!data.ok) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
      >
        {data.message}
      </div>
    );
  }

  return <DashboardBody data={data} />;
}

function DashboardBody({
  data,
}: {
  data: Extract<DashboardData, { ok: true }>;
}) {
  const [view, setView] = useState<View>("upcoming");
  const [showSpacs, setShowSpacs] = useState(false);
  const [statuses, setStatuses] = useState<IpoStatus[]>(DEFAULT_STATUSES);
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);

  const universe = useMemo(
    () =>
      data.ipos.filter((ipo) => {
        if (!showSpacs && ipo.isSpac) return false;
        if (ipo.date && (ipo.date < from || ipo.date > to)) return false;
        return true;
      }),
    [data.ipos, showSpacs, from, to],
  );

  const rows = useMemo(
    () =>
      filterIpos(data.ipos, {
        view,
        today: data.today,
        showSpacs,
        statuses,
        from,
        to,
      }),
    [data.ipos, data.today, view, showSpacs, statuses, from, to],
  );

  return (
    <section className="flex min-h-0 min-w-0 flex-col gap-6" aria-labelledby="dashboard-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dashboard-heading" className="text-lg font-semibold tracking-tight">
            US IPO calendar
          </h2>
          <p className="mt-1 text-sm text-muted">
            Source {data.source} · as of {formatIsoTimestamp(data.asOf)} · UTC dates
          </p>
        </div>
        <p className="text-sm text-muted">
          {rows.length} of {data.ipos.length} shown
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Calendar view" className="flex flex-wrap gap-2">
          {(["upcoming", "recent", "all"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${
                view === option
                  ? "bg-foreground text-background"
                  : "bg-card text-muted ring-1 ring-border hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={showSpacs}
              onChange={(event) => setShowSpacs(event.target.checked)}
              className="size-4 accent-accent"
            />
            Show SPACs
          </label>
          <label className="inline-flex items-center gap-2 text-muted">
            From
            <input
              type="date"
              value={from}
              min={data.from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-muted">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={data.to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
            />
          </label>
        </div>

        {view === "all" ? (
          <fieldset className="flex flex-wrap gap-3 text-sm">
            <legend className="sr-only">Status</legend>
            {ALL_STATUSES.map((status) => (
              <label key={status} className="inline-flex items-center gap-2 capitalize text-muted">
                <input
                  type="checkbox"
                  checked={statuses.includes(status)}
                  onChange={() =>
                    setStatuses((current) =>
                      current.includes(status)
                        ? current.filter((item) => item !== status)
                        : [...current, status],
                    )
                  }
                  className="size-4 accent-accent"
                />
                {status}
              </label>
            ))}
          </fieldset>
        ) : null}
      </div>

      <DashboardOverview
        ipos={universe}
        today={data.today}
        performance={data.performance}
      />

      <IpoTable rows={rows} />
    </section>
  );
}

function IpoTable({ rows }: { rows: Ipo[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No IPOs match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Filtered US IPO calendar</caption>
        <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Date
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Symbol
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Company
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Exchange
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Range
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Shares
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Value
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ipo, index) => (
            <tr
              key={`${ipo.symbol ?? ipo.name}-${ipo.date ?? "undated"}-${index}`}
              className="border-t border-border hover:bg-card-hover"
            >
              <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                {formatIsoDate(ipo.date)}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{ipo.symbol ?? "—"}</td>
              <td className="px-3 py-2">
                {ipo.name}
                {ipo.isSpac ? (
                  <span className="ml-2 text-xs text-muted">SPAC</span>
                ) : null}
              </td>
              <td className="px-3 py-2 text-muted">{ipo.exchange ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2">{formatPriceRange(ipo.priceRange)}</td>
              <td className="whitespace-nowrap px-3 py-2">{formatShares(ipo.shares)}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {formatUsdCompact(ipo.totalValue)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={ipo.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function filterIpos(
  ipos: Ipo[],
  options: {
    view: View;
    today: string;
    showSpacs: boolean;
    statuses: IpoStatus[];
    from: string;
    to: string;
  },
): Ipo[] {
  const filtered = ipos.filter((ipo) => {
    if (!options.showSpacs && ipo.isSpac) return false;
    if (ipo.date && (ipo.date < options.from || ipo.date > options.to)) return false;
    if (options.view === "upcoming") {
      return (
        !!ipo.date &&
        ipo.date >= options.today &&
        (ipo.status === "expected" || ipo.status === "priced")
      );
    }
    if (options.view === "recent") {
      return !!ipo.date && ipo.date < options.today && ipo.status === "priced";
    }
    return options.statuses.includes(ipo.status);
  });

  const direction = options.view === "upcoming" ? 1 : -1;
  return [...filtered].sort(
    (a, b) => direction * (a.date ?? "").localeCompare(b.date ?? ""),
  );
}
