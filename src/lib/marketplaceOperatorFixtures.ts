// M4A-3 · deterministic operator-only fixtures. Pure data — never post money or mutate live TEST rows.
// Used by unit/component tests (and a local preview). The 108-HTGe example is preserved.

import type {
  AdjudicationPreview,
  OperatorCaseContext,
  OperatorReviewQueueItem,
} from "@/types/marketplaceOperator";
import type { MarketplaceError } from "@/services/marketplaceParticipantService";

const TEST = "TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED";

export const fxQueueItem: OperatorReviewQueueItem = {
  fulfilment_ref: "MFL-op-1",
  payment_ref: "OPmt-op-1",
  review_reason: "DISPUTE",
  state: "MANUAL_REVIEW_REQUIRED",
  cash_amount: "100",
  currency: "HTG",
  participant_display: "Agent Pétionville",
  service_area: "Pétionville",
  dispute_origin: "customer",
  opened_at: "2026-07-25T09:00:00Z",
  case_age_seconds: 3600,
  sla_status: "AT_RISK",
  assigned_operator: null,
  four_eyes_status: "SECOND_APPROVAL_REQUIRED",
  already_adjudicated: false,
  test_notice: TEST,
};

export const fxQueue = { items: [fxQueueItem], total: 1, limit: 50, offset: 0 };
export const fxQueueEmpty = { items: [] as OperatorReviewQueueItem[], total: 0, limit: 50, offset: 0 };

export const fxCase: OperatorCaseContext = {
  fulfilment_ref: "MFL-op-1",
  payment_ref: "OPmt-op-1",
  state: "MANUAL_REVIEW_REQUIRED",
  review_reason: "DISPUTE",
  review_source: "customer",
  case_age_seconds: 3600,
  participant_display: "Agent Pétionville",
  collection_location: "Pétionville",
  cash_amount: "100",
  currency: "HTG",
  terminal_status: "IN_PROGRESS",
  dispute_status: "open",
  quote: {
    cash_amount: "100",
    total_customer_debit: "108",
    kiwoo_fee: "5",
    tax: "2",
    regulatory_fee: "1",
    participant_principal: "100",
    participant_compensation: "3",
    total_participant_entitlement: "103",
    quote_expiry: "2026-07-25T10:00:00Z",
    matching_policy_version: 1,
    pricing_policy_version: 1,
  },
  financial: {
    reserve_exists: true,
    settlement_journal_exists: false,
    compensation_journal_exists: false,
    settle_xor_compensate_ok: true,
    participant_entitlement_posted: false,
    customer_restored: false,
    outcome: "IN_PROGRESS",
  },
  liquidity: { matched_position_ref: "POS-1", lock_present: true, lock_consumed: false, lock_released: false, handover_prohibits_release: true },
  participant_actions: { accepted_at: "2026-07-25T09:10:00Z", rejected_at: null, rejection_reason: null, credential_verified_at: "2026-07-25T09:20:00Z", handover_confirmed_at: "2026-07-25T09:25:00Z", participant_dispute_reason: null },
  credential_evidence: { issued: true, verified: true, verified_at: "2026-07-25T09:20:00Z", single_use: true, expired: false },
  handover_evidence: { exists: true, confirmed_at: "2026-07-25T09:25:00Z", amount_binding: "100" },
  receipt_evidence: { customer_confirmed: false, customer_denied: true, confirmed_at: null, denied_at: "2026-07-25T09:40:00Z", timed_out: false },
  dispute_statements: [{ source: "customer", reason_code: "CUSTOMER_DENIES_RECEIPT", statement: null, at: "2026-07-25T09:40:00Z" }],
  reconciliation: { reason_code: "DISPUTE", requires_human_review: true, consistency: "CONSISTENT" },
  evidence_policy_verdict: "MANUAL_REVIEW_REQUIRED",
  participant_operational: { acceptance_rate: 0.9, rejection_rate: 0.05, timeout_rate: 0.02, dispute_rate: 0.03, sample_size: 40 },
  customer_safe: { alias: "Customer OP-op-1", ownership_confirmed: true, receipt_state: "denied" },
  timeline: [
    { at: "2026-07-25T09:10:00Z", type: "PARTICIPANT_ACCEPTED", actor_type: "participant", result: "CONFIRMED" },
    { at: "2026-07-25T09:20:00Z", type: "COLLECTION_CREDENTIAL_VERIFIED", actor_type: "participant", result: "CONFIRMED" },
    { at: "2026-07-25T09:25:00Z", type: "HANDOVER_CONFIRMED", actor_type: "participant", result: "CONFIRMED" },
    { at: "2026-07-25T09:40:00Z", type: "CUSTOMER_RECEIPT_DENIED", actor_type: "customer", result: "DENIED" },
  ],
  notes: [],
  four_eyes: { policy_version: 1, requires_second_approval: true, reasons: ["AMOUNT_AT_OR_ABOVE_THRESHOLD", "DISPUTE_CUSTOMER"], status: "SECOND_APPROVAL_REQUIRED", proposal: null },
  final_outcome: null,
  test_notice: TEST,
};

export const fxCasePending: OperatorCaseContext = {
  ...fxCase,
  four_eyes: {
    ...fxCase.four_eyes,
    status: "SECOND_APPROVAL_PENDING",
    proposal: { proposal_id: "PROP-1", decision: "SETTLE", reason: "EVIDENCE_SUPPORTS_HANDOVER", note: "reviewed", status: "PENDING", proposed_by: 42, resolved_by: null, requires_second_approval: true, policy_version: 1, created_at: "2026-07-25T09:50:00Z", resolved_at: null },
  },
};

export const fxCaseAdjudicated: OperatorCaseContext = {
  ...fxCase,
  state: "SETTLED",
  terminal_status: "COMPLETED",
  financial: { ...fxCase.financial, settlement_journal_exists: true, participant_entitlement_posted: true, outcome: "COMPLETED" },
  four_eyes: { ...fxCase.four_eyes, status: "APPROVED" },
  final_outcome: { decision: "SETTLE", adjudicating_operator: 43, approving_operator: 43, reason: "SETTLE:EVIDENCE_SUPPORTS_HANDOVER", policy_version: 1, decided_at: "2026-07-25T10:00:00Z", settlement_status: "COMPLETED" },
};

export const fxPreviewSettle: AdjudicationPreview = {
  decision: "SETTLE",
  final: true,
  amounts: { cash_amount: "100", participant_principal: "100", participant_compensation: "3", total_participant_entitlement: "103", kiwoo_fee: "5", tax: "2", regulatory_fee: "1", total_customer_debit: "108" },
  settle_effects: { customer_reserve_consumed: true, participant_principal_credited: true, participant_compensation_credited: true, kiwoo_fee_recognized: true, tax_posted: true, regulatory_fee_posted: true, liquidity_lock_consumed: true, compensation_becomes_impossible: true },
  test_notice: TEST,
};

export const fxPreviewCompensateProhibited: AdjudicationPreview = {
  decision: "COMPENSATE",
  final: true,
  amounts: fxPreviewSettle.amounts,
  compensate_effects: { customer_reserve_returned: true, liquidity_lock_released_if_safe: false, participant_principal_credited: false, participant_compensation_credited: false, settlement_becomes_impossible: true, compensation_prohibited: true, prohibited_reason: "handover_evidence_exists" },
  test_notice: TEST,
};

import type { MarketplaceReplay } from "@/types/marketplaceOperator";
export const fxReplay: MarketplaceReplay = {
  fulfilment_ref: "MFL-op-1",
  payment_ref: "OPmt-op-1",
  terminal: "SETTLED",
  events: [
    { at: "2026-07-25T09:10:00Z", source: "transition", event: "MarketplaceParticipantAccepted", actor_type: "participant", state: "PARTICIPANT_ACCEPTED", stage: "PARTICIPANT_ACCEPTANCE" },
    { at: "2026-07-25T09:20:00Z", source: "evidence", event: "COLLECTION_CREDENTIAL_VERIFIED", actor_type: "participant", state: null, stage: "CREDENTIAL_VERIFICATION" },
    { at: "2026-07-25T09:25:00Z", source: "evidence", event: "PARTICIPANT_HANDOVER_CONFIRMED", actor_type: "participant", state: null, stage: "CASH_HANDOVER" },
    { at: "2026-07-25T09:46:00Z", source: "transition", event: "MarketplaceSettled", actor_type: "system", state: "SETTLED", stage: "SETTLEMENT_OR_COMPENSATION" },
  ],
  stages: [
    { stage: "PARTICIPANT_ACCEPTANCE", order: 4, observed: true, occurrences: 1, first_at: "2026-07-25T09:10:00Z", status: "PRESENT" },
    { stage: "CASH_HANDOVER", order: 7, observed: true, occurrences: 1, first_at: "2026-07-25T09:25:00Z", status: "PRESENT" },
    { stage: "SETTLEMENT_OR_COMPENSATION", order: 13, observed: true, occurrences: 1, first_at: "2026-07-25T09:46:00Z", status: "PRESENT" },
  ],
  integrity: { has_missing: false, has_duplicate: false, out_of_order: false, missing_stages: [], duplicate_stages: [] },
};
export const fxReplayBroken: MarketplaceReplay = {
  ...fxReplay,
  integrity: { has_missing: true, has_duplicate: false, out_of_order: true, missing_stages: ["RESERVE"], duplicate_stages: [] },
};

export const fxOpErrorDisabled: MarketplaceError = { status: 503, code: "marketplace_operator_disabled", message: "marketplace_operator_disabled" };
export const fxOpErrorSelfApproval: MarketplaceError = { status: 403, code: "self_approval_forbidden", message: "self_approval_forbidden" };
