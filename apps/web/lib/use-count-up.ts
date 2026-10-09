"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, durationMs = 900, delayMs = 0): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    setValue(0);
    if (target === 0) return;

    let frame = 0;
    const timeout = window.setTimeout(() => {
      const started = performance.now();
      frame = requestAnimationFrame(function tick(now: number) {
        const progress = Math.min((now - started) / durationMs, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(target * eased);
        if (progress < 1) frame = requestAnimationFrame(tick);
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs, delayMs]);

  return value;
}
