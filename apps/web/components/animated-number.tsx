"use client";

import { useCountUp } from "@/lib/use-count-up";

export function AnimatedNumber({
  value,
  format,
  durationMs = 900,
  delayMs = 0,
}: {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
  delayMs?: number;
}) {
  const shown = useCountUp(value, durationMs, delayMs);
  return <>{format(shown)}</>;
}
