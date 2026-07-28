import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the shared axios instance so no network call is made. (vi.hoisted so the factory — hoisted
// above imports — can reference these mocks.)
const { get, post, patch } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get, post, patch } }));

import {
  marketplaceError,
  marketplaceParticipantService as svc,
} from "@/services/marketplaceParticipantService";

// M4A-2 · SERVICE — proves the client targets canonical participant routes, unwraps the
// successWrapper envelope, NEVER sends a participant id as an authority-bearing field, and maps backend
// errors (503 → feature disabled, 403 → ownership) to safe structured info.

const envelope = (data: unknown) => ({ data: { statusCode: 200, message: ["ok"], data } });

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
});

describe("route + envelope", () => {
  it("overview hits participant/marketplace/overview and unwraps .data.data", async () => {
    get.mockResolvedValueOnce(envelope({ currency: "HTG", declared_capacity: "5000", active_offers: 2 }));
    const o = await svc.overview();
    expect(get).toHaveBeenCalledWith("participant/marketplace/overview");
    expect(o.declared_capacity).toBe("5000");
    expect(o.active_offers).toBe(2);
  });

  it("obligations list passes scope and unwraps an array", async () => {
    get.mockResolvedValueOnce(envelope([{ fulfilment_ref: "MFL-1", state: "READY_FOR_COLLECTION" }]));
    const rows = await svc.listObligations("all");
    expect(get).toHaveBeenCalledWith("participant/marketplace/fulfilments", { params: { scope: "all" } });
    expect(rows[0].fulfilment_ref).toBe("MFL-1");
  });
});

describe("participant id is NEVER authority-bearing", () => {
  it("createPosition body has no participant/user id field", async () => {
    post.mockResolvedValueOnce(envelope({ position_ref: "POS-1" }));
    await svc.createPosition({ currency: "HTG", declared_capacity: "500" });
    const [, body] = post.mock.calls[0];
    const keys = Object.keys(body as Record<string, unknown>);
    expect(keys).not.toContain("participant_id");
    expect(keys).not.toContain("user_id");
    expect(keys).not.toContain("participantId");
  });

  it("accept/validate/handover send no identity field (server resolves from JWT)", async () => {
    post.mockResolvedValue(envelope({ status: "ok" }));
    await svc.acceptObligation("MFL-1");
    await svc.validateCode("MFL-1", { code: "ABCD", qr_token: "MQR-1", expected_amount: "100" });
    await svc.confirmHandover("MFL-1");
    for (const call of post.mock.calls) {
      const body = (call[1] ?? {}) as Record<string, unknown>;
      expect(Object.keys(body)).not.toContain("participant_id");
      expect(Object.keys(body)).not.toContain("user_id");
    }
    // validate-code carries only the credential fields.
    const validateBody = post.mock.calls[1][1] as Record<string, unknown>;
    expect(Object.keys(validateBody).sort()).toEqual(["code", "expected_amount", "qr_token"]);
  });
});

describe("error mapping", () => {
  it("503 → status 503 (feature disabled) with backend code", () => {
    const e = marketplaceError({ response: { status: 503, data: { message: ["marketplace_participant_disabled"] } } });
    expect(e.status).toBe(503);
    expect(e.code).toBe("marketplace_participant_disabled");
  });
  it("403 ownership error preserved", () => {
    const e = marketplaceError({ response: { status: 403, data: { message: ["fulfilment_not_owned"] } } });
    expect(e.status).toBe(403);
    expect(e.code).toBe("fulfilment_not_owned");
  });
  it("no stack trace leaks (message is the code string)", () => {
    const e = marketplaceError({ response: { status: 400, data: { message: ["collection_code_invalid"] } }, stack: "SECRET STACK" });
    expect(e.message).toBe("collection_code_invalid");
    expect(JSON.stringify(e)).not.toContain("SECRET STACK");
  });
});
