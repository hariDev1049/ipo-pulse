import { Suspense } from "react";
import { connection } from "next/server";
import { ChatPanel } from "@/components/chat-panel";
import { ChatSkeleton } from "@/components/chat-skeleton";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { IpoDashboard } from "@/components/ipo-dashboard";
import { loadDashboard } from "@/lib/dashboard-data";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border px-4 py-3 lg:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              IPO Pulse
            </p>
            <h1 className="text-xl font-semibold tracking-tight">US IPO dashboard</h1>
          </div>
          <p className="max-w-xl text-xs leading-5 text-muted">
            Public market data only. This is not investment advice, and the
            assistant will not recommend buying or selling.
          </p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="min-w-0 px-4 py-6 lg:px-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardSection />
          </Suspense>
        </main>
        <Suspense fallback={<ChatSkeleton />}>
          <ChatSection />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardSection() {
  const data = await loadDashboard();
  return <IpoDashboard data={data} />;
}

async function ChatSection() {
  await connection();
  return <ChatPanel />;
}
