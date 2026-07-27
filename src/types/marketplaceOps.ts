// M4A-4 · Operations Dashboard ("Control Tower") DTOs. Mirror the gated operations read-model. All
// projections are privacy-safe (no ledger accounts / journal ids / secrets / hashes / metadata / PII)
// and dark-safe (empty marketplace → zeros / empty arrays). The client NEVER recomputes authoritative
// values — it renders what the backend returns.

const n = (v: unknown): number => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v == null ? "0" : String(v));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export interface OpsSummary {
  declared_liquidity: string;
  available_liquidity: string;
  locked_liquidity: string;
  fulfilled_liquidity: string;
  active_participants: number;
  active_offers: number;
  paused_offers: number;
  pending_participant_acceptances: number;
  ready_for_collection: number;
  awaiting_customer_confirmation: number;
  manual_review_cases: number;
  open_disputes: number;
  pending_compensations: number;
  completed_settlements: number;
  completed_compensations: number;
  completed_settlements_today: number;
  completed_compensations_today: number;
  active_alerts: number;
}
export function parseSummary(v: unknown): OpsSummary {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    declared_liquidity: s(o.declared_liquidity),
    available_liquidity: s(o.available_liquidity),
    locked_liquidity: s(o.locked_liquidity),
    fulfilled_liquidity: s(o.fulfilled_liquidity),
    active_participants: n(o.active_participants),
    active_offers: n(o.active_offers),
    paused_offers: n(o.paused_offers),
    pending_participant_acceptances: n(o.pending_participant_acceptances),
    ready_for_collection: n(o.ready_for_collection),
    awaiting_customer_confirmation: n(o.awaiting_customer_confirmation),
    manual_review_cases: n(o.manual_review_cases),
    open_disputes: n(o.open_disputes),
    pending_compensations: n(o.pending_compensations),
    completed_settlements: n(o.completed_settlements),
    completed_compensations: n(o.completed_compensations),
    completed_settlements_today: n(o.completed_settlements_today),
    completed_compensations_today: n(o.completed_compensations_today),
    active_alerts: n(o.active_alerts),
  };
}

export interface OpsFunnel {
  quotes_issued: number;
  quotes_accepted: number;
  reserves_created: number;
  locks_acquired: number;
  participant_accepted: number;
  credentials_verified: number;
  handovers_confirmed: number;
  customer_receipts_confirmed: number;
  settled: number;
  compensated: number;
  disputed: number;
}
export function parseFunnel(v: unknown): OpsFunnel {
  const o = (v ?? {}) as Record<string, unknown>;
  const k = (key: string) => n(o[key]);
  return {
    quotes_issued: k("quotes_issued"), quotes_accepted: k("quotes_accepted"), reserves_created: k("reserves_created"),
    locks_acquired: k("locks_acquired"), participant_accepted: k("participant_accepted"), credentials_verified: k("credentials_verified"),
    handovers_confirmed: k("handovers_confirmed"), customer_receipts_confirmed: k("customer_receipts_confirmed"),
    settled: k("settled"), compensated: k("compensated"), disputed: k("disputed"),
  };
}

export interface OpsSla {
  participant_timeout_count: number;
  customer_confirmation_timeout_count: number;
  open_disputes: number;
  oldest_open_dispute_age_ms: number;
  open_manual_reviews: number;
  oldest_manual_review_age_ms: number;
}
export function parseSla(v: unknown): OpsSla {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    participant_timeout_count: n(o.participant_timeout_count),
    customer_confirmation_timeout_count: n(o.customer_confirmation_timeout_count),
    open_disputes: n(o.open_disputes),
    oldest_open_dispute_age_ms: n(o.oldest_open_dispute_age_ms),
    open_manual_reviews: n(o.open_manual_reviews),
    oldest_manual_review_age_ms: n(o.oldest_manual_review_age_ms),
  };
}

export interface OpsParticipant {
  participant_id: number;
  declared_liquidity: string;
  available_liquidity: string;
  locked_liquidity: string;
  fulfilled_liquidity: string;
  pending_obligations: number;
  accepted: number;
  rejected: number;
  timed_out: number;
  disputed: number;
  settled: number;
  compensated: number;
}
export interface Paged<T> { page: number; page_size: number; total: number; items: T[]; }
export function parseParticipants(v: unknown): Paged<OpsParticipant> {
  const o = (v ?? {}) as Record<string, unknown>;
  return { page: n(o.page) || 1, page_size: n(o.page_size) || 25, total: n(o.total), items: arr<OpsParticipant>(o.items) };
}

export interface OpsAlert {
  reference: string;
  reason_code: string;
  state: string;
  first_observed: string;
  last_observed: string;
  age_ms: number;
  recommended_action: string;
  deterministic_repair_available: boolean;
  human_review_required: boolean;
}
export function parseAlerts(v: unknown): { page: number; page_size: number; items: OpsAlert[] } {
  const o = (v ?? {}) as Record<string, unknown>;
  return { page: n(o.page) || 1, page_size: n(o.page_size) || 25, items: arr<OpsAlert>(o.items) };
}

export interface LiquidityBreakdown {
  total: { declared: string; locked: string; fulfilled: string; available: string };
  by_currency: Array<{ currency: string; declared: string; locked: string; fulfilled: string; available: string }>;
  by_service_area: Array<{ service_area: string; offers: number; declared: string; locked: string; fulfilled: string; available: string }>;
  by_offer_status: Array<{ status: string; offers: number }>;
}
export function parseLiquidity(v: unknown): LiquidityBreakdown {
  const o = (v ?? {}) as Partial<LiquidityBreakdown>;
  return {
    total: o.total ?? { declared: "0", locked: "0", fulfilled: "0", available: "0" },
    by_currency: arr(o.by_currency),
    by_service_area: arr(o.by_service_area),
    by_offer_status: arr(o.by_offer_status),
  };
}

export interface OpsTimelineItem { at: string; kind: string; event: string; actor_type: string; reference: string; }
export function parseTimeline(v: unknown): OpsTimelineItem[] { return arr<OpsTimelineItem>(v); }

export interface OpsSearchRow {
  fulfilment_ref: string;
  payment_ref: string | null;
  participant_id: number;
  state: string;
  amount: string;
  currency: string;
  service_area: string | null;
  reason: string | null;
  created_at: string;
}
export function parseSearch(v: unknown): { items: OpsSearchRow[]; total: number; limit: number } {
  const o = (v ?? {}) as Record<string, unknown>;
  return { items: arr<OpsSearchRow>(o.items), total: n(o.total), limit: n(o.limit) || 25 };
}

export interface TrendPoint { bucket_start: string; count: number; }
export function parseTrend(v: unknown): TrendPoint[] { return arr<TrendPoint>(v).map((p) => ({ bucket_start: s(p.bucket_start), count: n(p.count) })); }
