"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

const MIN_CHAT_PX = 280;
const DEFAULT_CHAT_PX = 384;
const MAX_SCREEN_FRACTION = 1 / 3;

function maxChatWidth(viewportWidth: number): number {
  return Math.floor(viewportWidth * MAX_SCREEN_FRACTION);
}

function clampChatWidth(width: number, viewportWidth: number): number {
  const max = maxChatWidth(viewportWidth);
  if (max <= MIN_CHAT_PX) return Math.max(max, 0);
  return Math.min(Math.max(width, MIN_CHAT_PX), max);
}

export function AppSplit({
  dashboard,
  chat,
}: {
  dashboard: ReactNode;
  chat: ReactNode;
}) {
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_PX);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function syncViewport() {
      setViewportWidth(window.innerWidth);
      setChatWidth((current) => clampChatWidth(current, window.innerWidth));
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("cursor-col-resize", dragging);
    document.body.classList.toggle("select-none", dragging);
    return () => {
      document.body.classList.remove("cursor-col-resize", "select-none");
    };
  }, [dragging]);

  function resizeTo(width: number) {
    setChatWidth(clampChatWidth(width, window.innerWidth));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: chatWidth };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const delta = drag.current.startX - event.clientX;
    resizeTo(drag.current.startWidth + delta);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeTo(chatWidth + step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeTo(chatWidth - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      resizeTo(MIN_CHAT_PX);
    } else if (event.key === "End") {
      event.preventDefault();
      resizeTo(maxChatWidth(window.innerWidth));
    }
  }

  const max = maxChatWidth(viewportWidth);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <main className="min-w-0 px-4 py-6 lg:min-h-0 lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto lg:px-6">
        {dashboard}
      </main>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat panel"
        aria-valuemin={MIN_CHAT_PX}
        aria-valuemax={max}
        aria-valuenow={Math.round(chatWidth)}
        aria-valuetext={`${Math.round(chatWidth)} pixels`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => resizeTo(DEFAULT_CHAT_PX)}
        onKeyDown={onKeyDown}
        title="Drag to resize chat. Double-click to reset."
        className={`group relative hidden w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center border-x border-border lg:flex ${
          dragging ? "bg-accent/20" : "hover:bg-zinc-800"
        }`}
      >
        <span className="my-auto h-8 w-1 rounded-full bg-zinc-600 group-hover:bg-accent group-focus-visible:bg-accent" />
      </div>
      <div
        className="flex min-h-[24rem] w-full flex-col overflow-hidden max-lg:!w-full lg:h-full lg:min-h-0 lg:shrink-0"
        style={{ width: chatWidth }}
      >
        {chat}
      </div>
    </div>
  );
}
