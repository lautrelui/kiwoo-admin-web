// M4A-2 · Corp/LEH Participant Interface — typed, privacy-safe DTOs.
//
// These mirror the backend's client-safe participant projections EXACTLY (snake_case on the wire, as
// the rest of the admin app does — see JournalSummary/AuditLog). They are explicit allowlists: the
// participant surface never receives customer wallet accounts, customer KYC, candidate matching lists,
// matching scores, operator notes, evidence hashes, ledger account ids, journal ids, raw collection
// codes/OTP, or the participant cost basis. Parsing is defensive — unknown states fail SAFE.

/** Canonical fulfilment states the participant may observe (superset of what any one screen shows). */
export const MARKETPLACE_STATES = [
  "PENDING",
  "LIQUIDITY_LOCKED",
  "PARTICIPANT_ACCEPTANCE_PENDING",
  "PARTICIPANT_ACCEPTED",
  "PARTICIPANT_REJECTED",
  "PARTICIPANT_ACCEPTANCE_TIMEOUT",
  "READY_FOR_COLLECTION",
  "COLLECTION_CREDENTIAL_VERIFIED",
  "READY_FOR_HANDOVER",
  "HANDOVER_CONFIRMED",
  "PARTICIPANT_HANDOVER_CONFIRMED",
  "CUSTOMER_RECEIPT_PENDING",
  "CUSTOMER_RECEIPT_CONFIRMED",
  "CUSTOMER_RECEIPT_DENIED",
  "EVIDENCE_SUFFICIENT",
  "CUSTOMER_CONFIRMATION_TIMEOUT",
  "MANUAL_REVIEW_REQUIRED",
  "CONFIRMED",
  "SETTLED",
  "COMPENSATED",
  "DISPUTED",
  "EXPIRED",
  "NEEDS_RECONCILIATION",
] as const;

export type MarketplaceState = (typeof MARKETPLACE_STATES)[number] | "UNKNOWN";

/** Safe mapper: any unrecognised / null state collapses to UNKNOWN (never throws, never guesses). */
export function toMarketplaceState(s: unknown): MarketplaceState {
  if (typeof s === "string" && (MARKETPLACE_STATES as readonly string[]).includes(s)) {
    return s as MarketplaceState;
  }
  return "UNKNOWN";
}

/** Position status is a small, closed set; unknown → the raw string is kept for display only. */
export type PositionStatus = "ACTIVE" | "PAUSED" | "WITHDRAWN" | string;

/**
 * A partner's own liquidity POSITION (declared/locked/fulfilled/available CAPACITY — server-derived).
 * Mirrors the deployed backend position view (`MarketplacePartnerLiquidityPosition`); the wire uses the
 * `*_capacity` field names and `position_ref`.
 */
export interface PositionView {
  position_ref: string;
  currency: string;
  status: PositionStatus;
  declared_capacity: string;
  locked_capacity: string;
  fulfilled_capacity: string;
  available_capacity: string;
  min_amount: string;
  max_amount: string;
  participant_cost_bps: number; // partner's own cost INPUT (not the customer price)
  payout_method: string | null;
  location_label: string | null;
  updated_at: string;
}

/** One obligation assigned to this participant. Opaque customer ref only — never customer PII. */
export interface ObligationView {
  fulfilment_ref: string;
  customer_ref: string; // opaque payment ref (not a name/phone/account)
  payout_amount: string; // principal cash to hand over
  participant_compensation: string; // separate Kiwoo-funded earning
  currency_hint: string;
  state: string; // raw; normalise with toMarketplaceState()
  acceptance_deadline: string | null;
  collection_deadline: string | null;
  qr_token: string | null; // present only once READY_FOR_COLLECTION
}

/**
 * Server-aggregated operational overview (authoritative — the client never sums rows for money).
 * NOTE: the deployed overview endpoint keeps the legacy wire keys `available_liquidity`, `active_offers`,
 * and `paused_offers` (they were NOT renamed backend-side); capacity totals use the `*_capacity` keys.
 */
export interface ParticipantOverview {
  currency: string;
  declared_capacity: string;
  available_liquidity: string; // wire key kept by the deployed overview endpoint
  locked_capacity: string;
  fulfilled_capacity: string;
  active_offers: number; // wire key kept by the deployed overview endpoint (count of active positions)
  paused_offers: number; // wire key kept by the deployed overview endpoint (count of paused positions)
  pending_obligations: number;
  ready_for_collection: number;
  awaiting_customer_confirmation: number;
  open_disputes: number;
  principal_pending_settlement: string;
  compensation_pending: string;
  settled_entitlement_today: string;
  operational_status: "ACTIVE" | "PAUSED" | "IDLE" | string;
  test_notice: string | null;
}

/** Participant receipt — principal vs compensation SEPARATED; no customer identity / ledger ids. */
export interface ParticipantReceipt {
  fulfilment_ref: string;
  status: string;
  principal: string;
  participant_compensation: string;
  total_entitlement: string;
  currency_hint: string;
  accepted_at: string | null;
  handover_confirmed_at: string | null;
  settled_at: string | null;
  test_notice: string | null;
}

/** One immutable, client-safe evidence-trail row (type/actor/state/result/time only — no hashes). */
export interface EvidenceTrailItem {
  type: string;
  actor_type: string;
  state: string;
  result: string;
  occurred_at: string;
}

/** Result of a credential validation / handover confirmation (backend-authoritative status string). */
export interface StatusResult {
  status: string;
}

// ── Defensive parsers ────────────────────────────────────────────────────────
// The backend already strips forbidden fields; these parsers additionally guarantee shape + types so
// a malformed/partial payload can never crash a screen or surface an unexpected key.

const s = (v: unknown): string => (v == null ? "" : String(v));
const sn = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** Money strings are kept as strings (never parsed to float) so no client rounding can occur. */
const money = (v: unknown): string => (v == null || v === "" ? "0" : String(v));

export function parsePosition(o: Record<string, unknown>): PositionView {
  return {
    position_ref: s(o.position_ref),
    currency: s(o.currency) || "HTG",
    status: s(o.status),
    declared_capacity: money(o.declared_capacity),
    locked_capacity: money(o.locked_capacity),
    fulfilled_capacity: money(o.fulfilled_capacity),
    available_capacity: money(o.available_capacity),
    min_amount: money(o.min_amount),
    max_amount: money(o.max_amount),
    participant_cost_bps: num(o.participant_cost_bps),
    payout_method: sn(o.payout_method),
    location_label: sn(o.location_label),
    updated_at: s(o.updated_at),
  };
}

export function parseObligation(o: Record<string, unknown>): ObligationView {
  return {
    fulfilment_ref: s(o.fulfilment_ref),
    customer_ref: s(o.customer_ref),
    payout_amount: money(o.payout_amount),
    participant_compensation: money(o.participant_compensation),
    currency_hint: s(o.currency_hint) || "HTG",
    state: s(o.state),
    acceptance_deadline: sn(o.acceptance_deadline),
    collection_deadline: sn(o.collection_deadline),
    qr_token: sn(o.qr_token),
  };
}

export function parseOverview(o: Record<string, unknown>): ParticipantOverview {
  return {
    currency: s(o.currency) || "HTG",
    declared_capacity: money(o.declared_capacity),
    available_liquidity: money(o.available_liquidity),
    locked_capacity: money(o.locked_capacity),
    fulfilled_capacity: money(o.fulfilled_capacity),
    active_offers: num(o.active_offers),
    paused_offers: num(o.paused_offers),
    pending_obligations: num(o.pending_obligations),
    ready_for_collection: num(o.ready_for_collection),
    awaiting_customer_confirmation: num(o.awaiting_customer_confirmation),
    open_disputes: num(o.open_disputes),
    principal_pending_settlement: money(o.principal_pending_settlement),
    compensation_pending: money(o.compensation_pending),
    settled_entitlement_today: money(o.settled_entitlement_today),
    operational_status: s(o.operational_status) || "IDLE",
    test_notice: sn(o.test_notice),
  };
}

export function parseReceipt(o: Record<string, unknown>): ParticipantReceipt {
  return {
    fulfilment_ref: s(o.fulfilment_ref),
    status: s(o.status),
    principal: money(o.principal),
    participant_compensation: money(o.participant_compensation),
    total_entitlement: money(o.total_entitlement),
    currency_hint: s(o.currency_hint) || "HTG",
    accepted_at: sn(o.accepted_at),
    handover_confirmed_at: sn(o.handover_confirmed_at),
    settled_at: sn(o.settled_at),
    test_notice: sn(o.test_notice),
  };
}

export function parseEvidenceItem(o: Record<string, unknown>): EvidenceTrailItem {
  return {
    type: s(o.type),
    actor_type: s(o.actor_type),
    state: s(o.state),
    result: s(o.result),
    occurred_at: s(o.occurred_at),
  };
}
