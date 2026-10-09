export function ChatSkeleton() {
  return (
    <aside className="flex h-full min-h-[28rem] flex-col border-t border-border bg-card lg:min-h-0 lg:border-t-0" aria-busy="true">
      <div className="border-b border-border px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="flex-1" />
      <div className="border-t border-border p-3">
        <div className="h-20 animate-pulse rounded-lg bg-zinc-800" />
      </div>
      <span className="sr-only">Loading chat</span>
    </aside>
  );
}
