// M4A-2 · Corp/LEH Participant Interface — display + domain helpers (NO business logic; Kiwoo is
// authoritative for pricing/matching/settlement). This module maps canonical states to participant
// screens, formats money WITHOUT reparsing to float (no client rounding), and holds the curated
// reason-code lists + liquidity-concept copy the interface renders.

import { MarketplaceState, toMarketplaceState } from "@/types/marketplace";

/** The mandatory TEST-transaction notice (matches the backend string verbatim). */
export const TEST_TRANSACTION_NOTICE = "TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED";

export type StateTone = "good" | "warn" | "bad" | "info" | "muted";
export type StateGroup =
  | "pending"
  | "accepted"
  | "ready"
  | "awaiting"
  | "settled"
  | "review"
  | "closed"
  | "unknown";

interface StateInfo {
  label: string;
  tone: StateTone;
  group: StateGroup;
  /** Short, participant-safe explanation of what this state means for them. */
  hint: string;
}

const STATE_INFO: Record<MarketplaceState, StateInfo> = {
  PENDING: { label: "Preparing", tone: "muted", group: "pending", hint: "Kiwoo is preparing this obligation." },
  LIQUIDITY_LOCKED: { label: "Capacity reserved", tone: "info", group: "pending", hint: "Capacity was reserved for this obligation." },
  PARTICIPANT_ACCEPTANCE_PENDING: { label: "Awaiting your decision", tone: "warn", group: "pending", hint: "Accept or reject before the deadline." },
  PARTICIPANT_ACCEPTED: { label: "Accepted", tone: "info", group: "accepted", hint: "Accepted — Kiwoo is issuing the customer's collection credential." },
  READY_FOR_COLLECTION: { label: "Ready for collection", tone: "info", group: "ready", hint: "Validate the customer's collection credential when they arrive." },
  COLLECTION_CREDENTIAL_VERIFIED: { label: "Credential verified", tone: "info", group: "ready", hint: "Credential verified — confirm cash handover only after you hand over the full amount." },
  READY_FOR_HANDOVER: { label: "Ready for handover", tone: "info", group: "ready", hint: "Ready to confirm cash handover." },
  HANDOVER_CONFIRMED: { label: "Handover recorded", tone: "info", group: "awaiting", hint: "Awaiting the customer's confirmation of receipt." },
  PARTICIPANT_HANDOVER_CONFIRMED: { label: "Handover recorded", tone: "info", group: "awaiting", hint: "Awaiting the customer's confirmation of receipt." },
  CUSTOMER_RECEIPT_PENDING: { label: "Awaiting customer", tone: "warn", group: "awaiting", hint: "Awaiting the customer's confirmation of receipt." },
  CUSTOMER_RECEIPT_CONFIRMED: { label: "Customer confirmed", tone: "good", group: "settled", hint: "Customer confirmed receipt; settlement follows." },
  EVIDENCE_SUFFICIENT: { label: "Confirmed", tone: "good", group: "settled", hint: "Evidence sufficient; settlement follows." },
  CONFIRMED: { label: "Confirmed", tone: "good", group: "settled", hint: "Confirmed; settlement follows." },
  SETTLED: { label: "Settled", tone: "good", group: "settled", hint: "Settled — your entitlement has been recorded." },
  CUSTOMER_RECEIPT_DENIED: { label: "Customer denied", tone: "bad", group: "review", hint: "Customer denied receipt; the case is under review." },
  CUSTOMER_CONFIRMATION_TIMEOUT: { label: "Customer timed out", tone: "warn", group: "review", hint: "Customer did not confirm in time; under review." },
  MANUAL_REVIEW_REQUIRED: { label: "Under review", tone: "warn", group: "review", hint: "Under Kiwoo review; settlement/compensation may be frozen." },
  DISPUTED: { label: "Disputed", tone: "warn", group: "review", hint: "A dispute is open; under Kiwoo review." },
  NEEDS_RECONCILIATION: { label: "Reconciling", tone: "warn", group: "review", hint: "Kiwoo is reconciling this obligation." },
  COMPENSATED: { label: "Compensated / cancelled", tone: "muted", group: "closed", hint: "This obligation was cancelled or compensated." },
  PARTICIPANT_REJECTED: { label: "Rejected", tone: "muted", group: "closed", hint: "You rejected this obligation." },
  PARTICIPANT_ACCEPTANCE_TIMEOUT: { label: "Acceptance expired", tone: "muted", group: "closed", hint: "The acceptance window expired." },
  EXPIRED: { label: "Expired", tone: "muted", group: "closed", hint: "This obligation expired." },
  UNKNOWN: { label: "Status unavailable", tone: "muted", group: "unknown", hint: "This status is not recognised by this app version — refresh, or contact support." },
};

export function stateInfo(raw: unknown): StateInfo {
  return STATE_INFO[toMarketplaceState(raw)];
}

/** True when the obligation is actionable by the participant right now (drives the primary CTA). */
export function stateGroup(raw: unknown): StateGroup {
  return stateInfo(raw).group;
}

// Reason codes are a CURATED client list (the backend accepts a free-form reason_code; there is no
// server-config reasons endpoint yet — see the API-gaps doc). Stable machine codes + human labels.
export const REJECT_REASONS: Array<{ code: string; label: string }> = [
  { code: "INSUFFICIENT_CASH_ON_HAND", label: "Not enough physical cash on hand" },
  { code: "OUTSIDE_SERVICE_AREA", label: "Outside my service area" },
  { code: "OUTSIDE_OPERATING_HOURS", label: "Outside my operating hours" },
  { code: "AMOUNT_TOO_LARGE", label: "Amount larger than I can fulfil" },
  { code: "TEMPORARILY_UNAVAILABLE", label: "Temporarily unavailable" },
  { code: "OTHER", label: "Other" },
];

export const DISPUTE_REASONS: Array<{ code: string; label: string }> = [
  { code: "CUSTOMER_NO_SHOW", label: "Customer did not show up" },
  { code: "CREDENTIAL_MISMATCH", label: "Credential did not match" },
  { code: "AMOUNT_DISCREPANCY", label: "Amount discrepancy" },
  { code: "CUSTOMER_DISPUTES_RECEIPT", label: "Customer disputes receipt after handover" },
  { code: "SUSPECTED_FRAUD", label: "Suspected fraud" },
  { code: "OTHER", label: "Other" },
];

// ── Liquidity concepts (definitions rendered in the UI — kept visually/semantically distinct) ──
export const LIQUIDITY_CONCEPTS: Array<{ term: string; definition: string }> = [
  { term: "Declared physical liquidity", definition: "Cash capacity you declare and make available for customer payouts. This is NOT your Kiwoo wallet balance." },
  { term: "Available liquidity", definition: "Capacity still available for matching (declared − locked − fulfilled)." },
  { term: "Locked liquidity", definition: "Capacity committed to accepted or pending obligations." },
  { term: "Fulfilled liquidity", definition: "Cash already handed over, awaiting redeclaration or accounting completion." },
  { term: "Principal advanced", definition: "The cash amount physically paid to the customer." },
  { term: "Participant compensation", definition: "The separate Kiwoo-funded amount you earn for fulfilling an obligation." },
  { term: "Total entitlement", definition: "Principal plus participant compensation." },
];

// ── Money + time formatting (no float reparsing of money; strings preserved) ──
/** Format a decimal money STRING for display without reparsing to float (avoids client rounding). */
export function formatMoney(value: string | null | undefined, currency = "HTGe"): string {
  if (value == null || value === "") return `— ${currency}`;
  const str = String(value);
  // Group the integer part with thousands separators, preserving the fractional part verbatim.
  const [intPart, fracPartRaw] = str.split(".");
  const neg = intPart.startsWith("-");
  const digits = (neg ? intPart.slice(1) : intPart).replace(/\D/g, "") || "0";
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = fracPartRaw ? `.${fracPartRaw.replace(/0+$/, "")}`.replace(/\.$/, "") : "";
  return `${neg ? "-" : ""}${grouped}${frac} ${currency}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

/** Human "time remaining" for an SLA deadline; negative → "expired". Display-only (server is truth). */
export function timeRemaining(deadline: string | null | undefined, nowMs = Date.now()): { expired: boolean; text: string } {
  if (!deadline) return { expired: false, text: "—" };
  const t = new Date(deadline).getTime();
  if (Number.isNaN(t)) return { expired: false, text: "—" };
  const ms = t - nowMs;
  if (ms <= 0) return { expired: true, text: "expired" };
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return { expired: false, text: `${h}h ${mins % 60}m left` };
  }
  return { expired: false, text: `${mins}m ${secs}s left` };
}

/** Map an offer status to a badge tone. */
export function offerTone(status: string): StateTone {
  if (status === "ACTIVE") return "good";
  if (status === "PAUSED") return "warn";
  if (status === "WITHDRAWN") return "muted";
  return "info";
}
