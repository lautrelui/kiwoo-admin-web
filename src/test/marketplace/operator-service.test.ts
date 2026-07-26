import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get, post } }));

import { marketplaceOperatorService as svc } from "@/services/marketplaceOperatorService";

// M4A-3 · SERVICE — the operator client targets canonical operator routes, unwraps the envelope, and
// NEVER sends operator/participant/customer id, amount, account, or settlement state as an
// authority-bearing field. Propose/approve carry only a decision + reason + note (or resolution note).

const env = (data: unknown) => ({ data: { statusCode: 200, message: ["ok"], data } });

beforeEach(() => { get.mockReset(); post.mockReset(); });

describe("routes + envelope", () => {
  it("reviews hits operator/marketplace/reviews with filters", async () => {
    get.mockResolvedValueOnce(env({ items: [], total: 0, limit: 50, offset: 0 }));
    await svc.reviews({ adjudication: "pending", limit: 50, offset: 0 });
    expect(get).toHaveBeenCalledWith("operator/marketplace/reviews", { params: { adjudication: "pending", limit: 50, offset: 0 } });
  });
  it("preview passes decision", async () => {
    get.mockResolvedValueOnce(env({ decision: "SETTLE" }));
    await svc.preview("MFL-1", "SETTLE");
    expect(get).toHaveBeenCalledWith("operator/marketplace/reviews/MFL-1/preview", { params: { decision: "SETTLE" } });
  });
});

describe("no authority-bearing / money fields in payloads", () => {
  it("propose body is exactly {decision, reason, note} — no amount/account/participant/operator id", async () => {
    post.mockResolvedValueOnce(env({ status: "second_approval_required", proposal_id: "P1", four_eyes: "SECOND_APPROVAL_PENDING" }));
    await svc.propose("MFL-1", { decision: "SETTLE", reason: "r", note: "n" });
    const [, body] = post.mock.calls[0];
    expect(Object.keys(body as object).sort()).toEqual(["decision", "note", "reason"]);
    const forbidden = ["amount", "principal", "compensation", "fee", "tax", "account", "ledger", "participant_id", "participant", "customer", "operator_id", "user_id", "settlement"];
    for (const f of forbidden) expect(Object.keys(body as object)).not.toContain(f);
  });
  it("approve body carries only an optional resolution note", async () => {
    post.mockResolvedValueOnce(env({ status: "adjudicated_settled", proposal_id: "P1", four_eyes: "APPROVED" }));
    await svc.approve("P1", "looks good");
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("operator/marketplace/proposals/P1/approve");
    expect(Object.keys(body as object)).toEqual(["resolution_note"]);
  });
  it("note body is {category, note, idempotency_key} only", async () => {
    post.mockResolvedValueOnce(env({ status: "noted" }));
    await svc.addNote("MFL-1", { category: "GENERAL", note: "hi", idempotency_key: "abc123" });
    const [, body] = post.mock.calls[0];
    expect(Object.keys(body as object).sort()).toEqual(["category", "idempotency_key", "note"]);
  });
});
