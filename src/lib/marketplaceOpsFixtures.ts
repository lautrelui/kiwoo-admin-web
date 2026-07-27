// M4A-4 · deterministic operations fixtures (empty + populated). Pure data — never call real endpoints
// or mutate live TEST rows. Used by unit/component tests + local preview.

import type {
  LiquidityBreakdown,
  OpsAlert,
  OpsFunnel,
  OpsParticipant,
  OpsSla,
  OpsSummary,
  OpsTimelineItem,
  TrendPoint,
} from "@/types/marketplaceOps";
import type { OpsSearchRow } from "@/types/marketplaceOps";

export const fxSummaryEmpty: OpsSummary = {
  declared_liquidity: "0", available_liquidity: "0", locked_liquidity: "0", fulfilled_liquidity: "0",
  active_participants: 0, active_offers: 0, paused_offers: 0, pending_participant_acceptances: 0,
  ready_for_collection: 0, awaiting_customer_confirmation: 0, manual_review_cases: 0, open_disputes: 0,
  pending_compensations: 0, completed_settlements: 0, completed_compensations: 0,
  completed_settlements_today: 0, completed_compensations_today: 0, active_alerts: 0,
};

export const fxSummary: OpsSummary = {
  declared_liquidity: "50000", available_liquidity: "38900", locked_liquidity: "9000", fulfilled_liquidity: "2100",
  active_participants: 6, active_offers: 8, paused_offers: 2, pending_participant_acceptances: 3,
  ready_for_collection: 2, awaiting_customer_confirmation: 4, manual_review_cases: 2, open_disputes: 1,
  pending_compensations: 1, completed_settlements: 120, completed_compensations: 4,
  completed_settlements_today: 12, completed_compensations_today: 1, active_alerts: 3,
};

export const fxFunnel: OpsFunnel = {
  quotes_issued: 200, quotes_accepted: 180, reserves_created: 175, locks_acquired: 175,
  participant_accepted: 170, credentials_verified: 160, handovers_confirmed: 150,
  customer_receipts_confirmed: 140, settled: 138, compensated: 6, disputed: 3,
};

export const fxFunnelEmpty: OpsFunnel = {
  quotes_issued: 0, quotes_accepted: 0, reserves_created: 0, locks_acquired: 0, participant_accepted: 0,
  credentials_verified: 0, handovers_confirmed: 0, customer_receipts_confirmed: 0, settled: 0, compensated: 0, disputed: 0,
};

export const fxSla: OpsSla = {
  participant_timeout_count: 2, customer_confirmation_timeout_count: 1, open_disputes: 1,
  oldest_open_dispute_age_ms: 5 * 3600_000, open_manual_reviews: 2, oldest_manual_review_age_ms: 26 * 3600_000,
};
export const fxSlaEmpty: OpsSla = {
  participant_timeout_count: 0, customer_confirmation_timeout_count: 0, open_disputes: 0,
  oldest_open_dispute_age_ms: 0, open_manual_reviews: 0, oldest_manual_review_age_ms: 0,
};

export const fxLiquidity: LiquidityBreakdown = {
  total: { declared: "50000", locked: "9000", fulfilled: "2100", available: "38900" },
  by_currency: [{ currency: "HTG", declared: "50000", locked: "9000", fulfilled: "2100", available: "38900" }],
  by_service_area: [
    { service_area: "Pétionville", offers: 4, declared: "30000", locked: "6000", fulfilled: "1500", available: "22500" },
    { service_area: "Delmas", offers: 2, declared: "12000", locked: "12000", fulfilled: "0", available: "0" },
    { service_area: "unspecified", offers: 2, declared: "8000", locked: "0", fulfilled: "600", available: "7400" },
  ],
  by_offer_status: [{ status: "ACTIVE", offers: 8 }, { status: "PAUSED", offers: 2 }],
};
export const fxLiquidityEmpty: LiquidityBreakdown = {
  total: { declared: "0", locked: "0", fulfilled: "0", available: "0" },
  by_currency: [], by_service_area: [], by_offer_status: [],
};

export const fxParticipant: OpsParticipant = {
  participant_id: 42, declared_liquidity: "10000", available_liquidity: "7000", locked_liquidity: "2000", fulfilled_liquidity: "1000",
  pending_obligations: 1, accepted: 5, rejected: 1, timed_out: 0, disputed: 1, settled: 20, compensated: 0,
};

export const fxAlert: OpsAlert = {
  reference: "MFL-alert-1", reason_code: "SETTLEMENT_INCONSISTENCY", state: "SETTLED",
  first_observed: "2026-07-25T09:00:00Z", last_observed: "2026-07-25T09:30:00Z", age_ms: 5 * 3600_000,
  recommended_action: "reconcile: consume lock", deterministic_repair_available: true, human_review_required: false,
};

export const fxTimeline: OpsTimelineItem[] = [
  { at: "2026-07-25T09:24:00Z", kind: "transition", event: "MarketplaceSettled", actor_type: "system", reference: "OPmt-1" },
  { at: "2026-07-25T09:24:00Z", kind: "evidence", event: "CUSTOMER_RECEIPT_CONFIRMED", actor_type: "customer", reference: "MFL-1" },
  { at: "2026-07-25T09:21:00Z", kind: "evidence", event: "PARTICIPANT_HANDOVER_CONFIRMED", actor_type: "participant", reference: "MFL-1" },
];

export const fxTrend: TrendPoint[] = [
  { bucket_start: "2026-07-23T00:00:00Z", count: 40 },
  { bucket_start: "2026-07-24T00:00:00Z", count: 55 },
  { bucket_start: "2026-07-25T00:00:00Z", count: 48 },
];

export const fxSearchRow: OpsSearchRow = {
  fulfilment_ref: "MFL-1", payment_ref: "OPmt-1", participant_id: 42, state: "MANUAL_REVIEW_REQUIRED",
  amount: "100", currency: "HTG", service_area: "Pétionville", reason: "DISPUTE", created_at: "2026-07-25T09:00:00Z",
};
