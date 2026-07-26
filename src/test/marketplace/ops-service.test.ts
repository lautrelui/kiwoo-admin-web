import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get } }));

import { marketplaceOpsService as svc } from "@/services/marketplaceOpsService";

// M4A-4 · SERVICE — the Control Tower client is READ-ONLY (all GET), targets the gated
// operations/marketplace/* routes, unwraps the envelope, and parses dark-safe (empty → zeros/[]).

const env = (data: unknown) => ({ data: { statusCode: 200, message: ["ok"], data } });
beforeEach(() => get.mockReset());

describe("read-only ops routes + envelope", () => {
  it("summary parses dark-safe zeros from an empty payload", async () => {
    get.mockResolvedValueOnce(env({}));
    const s = await svc.summary();
    expect(get).toHaveBeenCalledWith("operations/marketplace/summary");
    expect(s.active_participants).toBe(0);
    expect(s.declared_liquidity).toBe("0");
  });
  it("trends passes metric/bucket/days and parses points", async () => {
    get.mockResolvedValueOnce(env([{ bucket_start: "2026-07-25T00:00:00Z", count: 5 }]));
    const t = await svc.trends("settlements", "day", 30);
    expect(get).toHaveBeenCalledWith("operations/marketplace/trends", { params: { metric: "settlements", bucket: "day", days: 30 } });
    expect(t[0].count).toBe(5);
  });
  it("search passes filters + parses items/total", async () => {
    get.mockResolvedValueOnce(env({ items: [], total: 0, limit: 25 }));
    await svc.search({ q: "MFL", state: "SETTLED", limit: 25 });
    expect(get).toHaveBeenCalledWith("operations/marketplace/search", { params: { q: "MFL", state: "SETTLED", limit: 25 } });
  });
  it("liquidity parses breakdown arrays", async () => {
    get.mockResolvedValueOnce(env({ total: { declared: "1", locked: "0", fulfilled: "0", available: "1" }, by_currency: [], by_service_area: [], by_offer_status: [] }));
    const l = await svc.liquidity();
    expect(l.total.available).toBe("1");
    expect(Array.isArray(l.by_service_area)).toBe(true);
  });
});
