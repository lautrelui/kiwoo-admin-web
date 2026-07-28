// M4A-2 · deterministic participant-only fixtures. Pure data — they NEVER call a real financial
// endpoint and are never seeded into a live DB. Used by unit/component tests and (optionally) a local
// preview. The 108-HTGe accounting example is preserved verbatim (principal 100 / compensation 3 /
// total entitlement 103; the 3 is Kiwoo-funded, NOT deducted from the 100).

import type {
  EvidenceTrailItem,
  ObligationView,
  PositionView,
  ParticipantOverview,
  ParticipantReceipt,
} from "@/types/marketplace";
import { TEST_TRANSACTION_NOTICE } from "@/lib/marketplace";
import type { MarketplaceError } from "@/services/marketplaceParticipantService";

export const fxOverviewEmpty: ParticipantOverview = {
  currency: "HTG",
  declared_capacity: "0",
  available_liquidity: "0",
  locked_capacity: "0",
  fulfilled_capacity: "0",
  active_offers: 0,
  paused_offers: 0,
  pending_obligations: 0,
  ready_for_collection: 0,
  awaiting_customer_confirmation: 0,
  open_disputes: 0,
  principal_pending_settlement: "0",
  compensation_pending: "0",
  settled_entitlement_today: "0",
  operational_status: "IDLE",
  test_notice: TEST_TRANSACTION_NOTICE,
};

export const fxOverviewActive: ParticipantOverview = {
  currency: "HTG",
  declared_capacity: "5000",
  available_liquidity: "3897",
  locked_capacity: "1000",
  fulfilled_capacity: "103",
  active_offers: 2,
  paused_offers: 1,
  pending_obligations: 1,
  ready_for_collection: 1,
  awaiting_customer_confirmation: 1,
  open_disputes: 1,
  principal_pending_settlement: "100",
  compensation_pending: "3",
  settled_entitlement_today: "103",
  operational_status: "ACTIVE",
  test_notice: TEST_TRANSACTION_NOTICE,
};

export const fxPositionActive: PositionView = {
  position_ref: "POS-active-1",
  currency: "HTG",
  status: "ACTIVE",
  declared_capacity: "5000",
  locked_capacity: "1000",
  fulfilled_capacity: "103",
  available_capacity: "3897",
  min_amount: "50",
  max_amount: "2000",
  participant_cost_bps: 25,
  payout_method: "agent_cash",
  location_label: "Pétionville",
  updated_at: "2026-07-25T12:00:00Z",
};

export const fxPositionPaused: PositionView = {
  ...fxPositionActive,
  position_ref: "POS-paused-1",
  status: "PAUSED",
  location_label: "Delmas",
};

export const fxPositionFullyLocked: PositionView = {
  ...fxPositionActive,
  position_ref: "POS-locked-1",
  declared_capacity: "1000",
  locked_capacity: "1000",
  fulfilled_capacity: "0",
  available_capacity: "0",
};

export const fxObligationPending: ObligationView = {
  fulfilment_ref: "MFL-pending-1",
  customer_ref: "OPmt-abc123",
  payout_amount: "100",
  participant_compensation: "3",
  currency_hint: "HTG",
  state: "PARTICIPANT_ACCEPTANCE_PENDING",
  acceptance_deadline: "2026-07-25T12:10:00Z",
  collection_deadline: "2026-07-25T12:40:00Z",
  qr_token: null,
};

export const fxObligationAccepted: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-accepted-1",
  state: "PARTICIPANT_ACCEPTED",
};

export const fxObligationReady: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-ready-1",
  state: "READY_FOR_COLLECTION",
  qr_token: "MQR-opaque-xyz",
};

export const fxObligationCredentialVerified: ObligationView = {
  ...fxObligationReady,
  fulfilment_ref: "MFL-verified-1",
  state: "COLLECTION_CREDENTIAL_VERIFIED",
};

export const fxObligationWaitingCustomer: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-waiting-1",
  state: "CUSTOMER_RECEIPT_PENDING",
  qr_token: null,
};

export const fxObligationDisputed: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-disputed-1",
  state: "MANUAL_REVIEW_REQUIRED",
};

export const fxObligationSettled: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-settled-1",
  state: "SETTLED",
};

export const fxObligationUnknown: ObligationView = {
  ...fxObligationPending,
  fulfilment_ref: "MFL-unknown-1",
  state: "SOME_FUTURE_STATE_v9",
};

export const fxReceiptSettled: ParticipantReceipt = {
  fulfilment_ref: "MFL-settled-1",
  status: "SETTLED",
  principal: "100",
  participant_compensation: "3",
  total_entitlement: "103",
  currency_hint: "HTG",
  accepted_at: "2026-07-25T09:24:00Z",
  handover_confirmed_at: "2026-07-25T09:43:00Z",
  settled_at: "2026-07-25T09:46:00Z",
  test_notice: TEST_TRANSACTION_NOTICE,
};

export const fxReceiptCompensated: ParticipantReceipt = {
  ...fxReceiptSettled,
  fulfilment_ref: "MFL-comp-1",
  status: "COMPENSATED",
  settled_at: null,
};

export const fxEvidenceTrail: EvidenceTrailItem[] = [
  { type: "PARTICIPANT_ACCEPTED", actor_type: "participant", state: "VALID", result: "CONFIRMED", occurred_at: "2026-07-25T09:24:00Z" },
  { type: "COLLECTION_CREDENTIAL_VERIFIED", actor_type: "participant", state: "VALID", result: "CONFIRMED", occurred_at: "2026-07-25T09:41:00Z" },
  { type: "HANDOVER_CONFIRMED", actor_type: "participant", state: "VALID", result: "CONFIRMED", occurred_at: "2026-07-25T09:43:00Z" },
  { type: "CUSTOMER_RECEIPT_CONFIRMED", actor_type: "customer", state: "VALID", result: "CONFIRMED", occurred_at: "2026-07-25T09:46:00Z" },
];

// Error/edge fixtures.
export const fxErrorDisabled: MarketplaceError = { status: 503, code: "marketplace_participant_disabled", message: "marketplace_participant_disabled" };
export const fxErrorUnauthorized: MarketplaceError = { status: 403, code: "fulfilment_not_owned", message: "fulfilment_not_owned" };
export const fxErrorInvalidCredential: MarketplaceError = { status: 400, code: "collection_code_invalid", message: "collection_code_invalid" };
export const fxErrorExpiredCredential: MarketplaceError = { status: 409, code: "collection_code_expired", message: "collection_code_expired" };
