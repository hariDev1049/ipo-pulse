import { Suspense } from "react";
import { connection } from "next/server";
import { AppSplit } from "@/components/app-split";
import { ChatPanel } from "@/components/chat-panel";
import { ChatSkeleton } from "@/components/chat-skeleton";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { IpoDashboard } from "@/components/ipo-dashboard";
import { loadDashboard } from "@/lib/dashboard-data";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3 lg:px-6">
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

      <AppSplit
        dashboard={
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardSection />
          </Suspense>
        }
        chat={
          <Suspense fallback={<ChatSkeleton />}>
            <ChatSection />
          </Suspense>
        }
      />
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
