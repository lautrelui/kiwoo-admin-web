// M4A-3 · operator-console DTOs. Mirror the backend operator-safe projections EXACTLY. Operators see
// expanded review evidence but these shapes still exclude raw OTP / collection code / QR payload /
// Argon2 hash / device+session hashes / ledger accounts / raw journal ids / full KYC / arbitrary
// metadata. Journal presence is a boolean. Amounts come from the immutable snapshot. Operator notes
// live ONLY here (never in customer/participant DTOs).

export type FourEyesStatus =
  | "NONE"
  | "SINGLE_APPROVAL_PERMITTED"
  | "SECOND_APPROVAL_REQUIRED"
  | "SECOND_APPROVAL_PENDING"
  | "APPROVED"
  | "REJECTED";

export type SlaStatus = "ON_TIME" | "AT_RISK" | "BREACHED" | "NONE";

export interface OperatorReviewQueueItem {
  fulfilment_ref: string;
  payment_ref: string | null;
  review_reason: string | null;
  state: string;
  cash_amount: string;
  currency: string;
  participant_display: string;
  service_area: string | null;
  dispute_origin: string | null;
  opened_at: string | null;
  case_age_seconds: number | null;
  sla_status: SlaStatus;
  assigned_operator: string | null;
  four_eyes_status: FourEyesStatus;
  already_adjudicated: boolean;
  test_notice: string | null;
}

export interface FourEyesPolicyView {
  policy_version: number;
  requires_second_approval: boolean;
  reasons: string[];
}

export interface QuoteSnapshotView {
  cash_amount: string;
  total_customer_debit: string;
  kiwoo_fee: string;
  tax: string;
  regulatory_fee: string;
  participant_principal: string;
  participant_compensation: string;
  total_participant_entitlement: string;
  quote_expiry: string | null;
  matching_policy_version: number | null;
  pricing_policy_version: number | null;
}

export interface OperatorProposalView {
  proposal_id: string;
  decision: "SETTLE" | "COMPENSATE";
  reason: string;
  note: string;
  status: string;
  proposed_by: number;
  resolved_by: number | null;
  requires_second_approval: boolean;
  policy_version: number;
  created_at: string;
  resolved_at: string | null;
}

export interface OperatorCaseContext {
  fulfilment_ref: string;
  payment_ref: string | null;
  state: string;
  review_reason: string | null;
  review_source: string | null;
  case_age_seconds: number | null;
  participant_display: string;
  collection_location: string | null;
  cash_amount: string;
  currency: string;
  terminal_status: string | null;
  dispute_status: string | null;
  quote: QuoteSnapshotView | null;
  financial: {
    reserve_exists: boolean;
    settlement_journal_exists: boolean;
    compensation_journal_exists: boolean;
    settle_xor_compensate_ok: boolean;
    participant_entitlement_posted: boolean;
    customer_restored: boolean;
    outcome: string | null;
  };
  liquidity: {
    matched_offer_ref: string | null;
    lock_present: boolean;
    lock_consumed: boolean;
    lock_released: boolean;
    handover_prohibits_release: boolean;
  };
  participant_actions: {
    accepted_at: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    credential_verified_at: string | null;
    handover_confirmed_at: string | null;
    participant_dispute_reason: string | null;
  };
  credential_evidence: { issued: boolean; verified: boolean; verified_at: string | null; single_use: boolean; expired: boolean };
  handover_evidence: { exists: boolean; confirmed_at: string | null; amount_binding: string | null };
  receipt_evidence: { customer_confirmed: boolean; customer_denied: boolean; confirmed_at: string | null; denied_at: string | null; timed_out: boolean };
  dispute_statements: Array<{ source: string; reason_code: string | null; statement: string | null; at: string | null }>;
  reconciliation: { reason_code: string | null; requires_human_review: boolean; consistency: string };
  evidence_policy_verdict: string | null;
  participant_operational: {
    acceptance_rate: number | null;
    rejection_rate: number | null;
    timeout_rate: number | null;
    dispute_rate: number | null;
    sample_size: number;
  } | null;
  customer_safe: { alias: string; ownership_confirmed: boolean; receipt_state: string };
  timeline: Array<{ at: string; type: string; actor_type: string; result: string }>;
  notes: Array<{ at: string; operator_id: number | null; category: string | null; text: string | null }>;
  four_eyes: FourEyesPolicyView & { status: FourEyesStatus; proposal: OperatorProposalView | null };
  final_outcome: {
    decision: "SETTLE" | "COMPENSATE" | null;
    adjudicating_operator: number | null;
    approving_operator: number | null;
    reason: string | null;
    policy_version: number | null;
    decided_at: string | null;
    settlement_status: string | null;
  } | null;
  test_notice: string | null;
}

export interface AdjudicationPreview {
  decision: "SETTLE" | "COMPENSATE";
  final: true;
  amounts: {
    cash_amount: string;
    participant_principal: string;
    participant_compensation: string;
    total_participant_entitlement: string;
    kiwoo_fee: string;
    tax: string;
    regulatory_fee: string;
    total_customer_debit: string;
  };
  settle_effects?: Record<string, boolean>;
  compensate_effects?: {
    customer_reserve_returned: boolean;
    liquidity_lock_released_if_safe: boolean;
    participant_principal_credited: boolean;
    participant_compensation_credited: boolean;
    settlement_becomes_impossible: boolean;
    compensation_prohibited: boolean;
    prohibited_reason: string | null;
  };
  test_notice: string | null;
}

export interface ProposalActionResult {
  status: string;
  proposal_id: string;
  four_eyes: FourEyesStatus;
}

// Defensive top-level parsers. The nested context is backend-authoritative + allowlisted; we coerce
// the top-level array/object shape and guarantee arrays exist so a screen can never crash.
const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function parseQueue(v: unknown): { items: OperatorReviewQueueItem[]; total: number; limit: number; offset: number } {
  const o = (v ?? {}) as { items?: unknown; total?: unknown; limit?: unknown; offset?: unknown };
  return {
    items: asArr<OperatorReviewQueueItem>(o.items),
    total: Number(o.total ?? 0) || 0,
    limit: Number(o.limit ?? 50) || 50,
    offset: Number(o.offset ?? 0) || 0,
  };
}

// M4B · Marketplace Replay (immutable event-driven lifecycle reconstruction; privacy-safe).
export interface ReplayEvent { at: string; source: string; event: string; actor_type: string; state: string | null; stage: string | null; }
export interface ReplayStageStatus { stage: string; order: number; observed: boolean; occurrences: number; first_at: string | null; status: string; }
export interface MarketplaceReplay {
  fulfilment_ref: string | null;
  payment_ref: string;
  terminal: string | null;
  events: ReplayEvent[];
  stages: ReplayStageStatus[];
  integrity: { has_missing: boolean; has_duplicate: boolean; out_of_order: boolean; missing_stages: string[]; duplicate_stages: string[] };
}
export function parseReplay(v: unknown): MarketplaceReplay {
  const r = (v ?? {}) as Partial<MarketplaceReplay>;
  return {
    fulfilment_ref: r.fulfilment_ref ?? null,
    payment_ref: r.payment_ref ?? "",
    terminal: r.terminal ?? null,
    events: asArr(r.events),
    stages: asArr(r.stages),
    integrity: r.integrity ?? { has_missing: false, has_duplicate: false, out_of_order: false, missing_stages: [], duplicate_stages: [] },
  };
}

export function parseCaseContext(v: unknown): OperatorCaseContext {
  const c = (v ?? {}) as OperatorCaseContext;
  // Guarantee arrays + nested objects exist.
  return {
    ...c,
    dispute_statements: asArr(c.dispute_statements),
    timeline: asArr(c.timeline),
    notes: asArr(c.notes),
    four_eyes: c.four_eyes ?? { policy_version: 0, requires_second_approval: true, reasons: [], status: "SECOND_APPROVAL_REQUIRED", proposal: null },
  };
}
