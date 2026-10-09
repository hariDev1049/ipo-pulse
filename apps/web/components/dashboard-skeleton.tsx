export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="flex gap-2">
        <div className="h-8 w-24 animate-pulse rounded-full bg-zinc-800" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-zinc-800" />
        <div className="h-8 w-16 animate-pulse rounded-full bg-zinc-800" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-11 border-b border-border last:border-b-0"
          >
            <div className="m-3 h-4 w-[70%] animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading IPO calendar</span>
    </div>
  );
}
