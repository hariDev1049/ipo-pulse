import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  it("evicts the oldest entry when full", async () => {
    const cache = new TtlCache(2);
    const load = vi.fn(async (key: string) => key);
    const get = (key: string) => cache.getOrLoad(key, 60_000, () => load(key));

    await get("a");
    await get("b");
    await get("c");
    await get("b");
    await get("a");

    expect(load.mock.calls.map(([key]) => key)).toEqual(["a", "b", "c", "a"]);
  });
});