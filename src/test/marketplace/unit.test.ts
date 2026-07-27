import { describe, expect, it } from "vitest";
import {
  parseObligation,
  parseOverview,
  parseReceipt,
  toMarketplaceState,
} from "@/types/marketplace";
import { formatMoney, stateGroup, stateInfo, timeRemaining } from "@/lib/marketplace";
import {
  fxObligationSettled,
  fxObligationUnknown,
  fxOverviewActive,
  fxReceiptSettled,
} from "@/lib/marketplaceFixtures";

// M4A-2 · UNIT — DTO parsing, state mapping (unknown fails safe), money rendering (no float rounding),
// principal/compensation/entitlement separation, and privacy allowlist on the parsed shapes.

// Fields that must NEVER appear in a participant client-safe projection.
const FORBIDDEN = [
  "collection_code_hash",
  "qr_token_hash",
  "device_ref_hash",
  "session_ref_hash",
  "reservation_journal_id",
  "settlement_journal_id",
  "compensation_journal_id",
  "liquidity_lock_id",
  "participant_cost_bps",
  "pricing_context",
  "matching_policy_id",
  "adjudicated_by",
  "adjudication_reason",
  "user_id",
  "quote_id",
  "execution_id",
];

describe("state mapping", () => {
  it("maps canonical states; unknown/null → UNKNOWN (safe fallback)", () => {
    expect(toMarketplaceState("READY_FOR_COLLECTION")).toBe("READY_FOR_COLLECTION");
    expect(toMarketplaceState("SETTLED")).toBe("SETTLED");
    expect(toMarketplaceState("SOME_FUTURE_STATE_v9")).toBe("UNKNOWN");
    expect(toMarketplaceState(null)).toBe("UNKNOWN");
    expect(toMarketplaceState(undefined)).toBe("UNKNOWN");
  });

  it("stateInfo groups drive the right screen bucket", () => {
    expect(stateGroup("PARTICIPANT_ACCEPTANCE_PENDING")).toBe("pending");
    expect(stateGroup("READY_FOR_COLLECTION")).toBe("ready");
    expect(stateGroup("CUSTOMER_RECEIPT_PENDING")).toBe("awaiting");
    expect(stateGroup("MANUAL_REVIEW_REQUIRED")).toBe("review");
    expect(stateGroup("SETTLED")).toBe("settled");
    expect(stateGroup("COMPENSATED")).toBe("closed");
    expect(stateGroup("SOME_FUTURE_STATE")).toBe("unknown");
  });

  it("unknown state renders a safe label (never guesses)", () => {
    expect(stateInfo("nonsense").label).toBe("Status unavailable");
  });
});

describe("money formatting (no float reparsing)", () => {
  it("groups integers, preserves fractions verbatim, keeps precision", () => {
    expect(formatMoney("1000", "HTGe")).toBe("1,000 HTGe");
    expect(formatMoney("1234567.89", "HTG")).toBe("1,234,567.89 HTG");
    expect(formatMoney("0", "HTG")).toBe("0 HTG");
    // A high-precision decimal is not rounded away.
    expect(formatMoney("100.12345678", "HTGe")).toBe("100.12345678 HTGe");
    expect(formatMoney(null)).toContain("—");
  });
});

describe("DTO parsing", () => {
  it("overview parses aggregates as strings/numbers", () => {
    const o = parseOverview(fxOverviewActive as unknown as Record<string, unknown>);
    expect(o.declared_liquidity).toBe("5000");
    expect(o.active_offers).toBe(2);
    expect(o.operational_status).toBe("ACTIVE");
  });

  it("obligation with unknown state still parses; state normalises to UNKNOWN", () => {
    const o = parseObligation(fxObligationUnknown as unknown as Record<string, unknown>);
    expect(o.fulfilment_ref).toBe("MFL-unknown-1");
    expect(toMarketplaceState(o.state)).toBe("UNKNOWN");
  });

  it("receipt keeps principal, compensation and entitlement SEPARATE (comp not deducted)", () => {
    const r = parseReceipt(fxReceiptSettled as unknown as Record<string, unknown>);
    expect(r.principal).toBe("100");
    expect(r.participant_compensation).toBe("3");
    expect(r.total_entitlement).toBe("103");
    // 100 + 3 = 103 → compensation is additive, not a deduction from the 100.
    expect(Number(r.principal) + Number(r.participant_compensation)).toBe(Number(r.total_entitlement));
  });

  it("missing fields default safely (no crash, zeros for money)", () => {
    const o = parseOverview({});
    expect(o.declared_liquidity).toBe("0");
    expect(o.operational_status).toBe("IDLE");
    const ob = parseObligation({});
    expect(ob.payout_amount).toBe("0");
  });
});

describe("privacy allowlist (parsed projections)", () => {
  it("parsed obligation + receipt + overview contain no forbidden keys", () => {
    const blobs = [
      JSON.stringify(parseObligation(fxObligationSettled as unknown as Record<string, unknown>)),
      JSON.stringify(parseReceipt(fxReceiptSettled as unknown as Record<string, unknown>)),
      JSON.stringify(parseOverview(fxOverviewActive as unknown as Record<string, unknown>)),
    ];
    for (const b of blobs) for (const f of FORBIDDEN) expect(b).not.toContain(`"${f}"`);
  });
});

describe("SLA countdown (display-only)", () => {
  it("expired past deadlines; formats remaining time", () => {
    const now = Date.parse("2026-07-25T12:00:00Z");
    expect(timeRemaining("2026-07-25T11:59:00Z", now).expired).toBe(true);
    const r = timeRemaining("2026-07-25T12:05:00Z", now);
    expect(r.expired).toBe(false);
    expect(r.text).toContain("m");
  });
});
