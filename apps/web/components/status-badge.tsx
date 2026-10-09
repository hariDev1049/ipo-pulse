import type { IpoStatus } from "@ipo-pulse/core";

const STYLES: Record<IpoStatus, string> = {
  expected: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  priced: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  filed: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  withdrawn: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

export function StatusBadge({ status }: { status: IpoStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
