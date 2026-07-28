import { AxiosError } from "axios";
import { api } from "@/lib/api";
import {
  EvidenceTrailItem,
  ObligationView,
  PositionView,
  ParticipantOverview,
  ParticipantReceipt,
  StatusResult,
  parseEvidenceItem,
  parseObligation,
  parsePosition,
  parseOverview,
  parseReceipt,
} from "@/types/marketplace";

// M4A-2 · Corp/LEH Participant Interface — canonical participant API client.
//
// Every call targets the canonical `participant/marketplace/*` routes (NOT operator/ops routes).
// Participant identity is resolved SERVER-SIDE from the JWT — this client NEVER sends a participant id
// as an authority-bearing field. The backend wraps responses as { statusCode, message:[...], data },
// so we unwrap `.data.data`. All write routes are gated by MARKETPLACE_PARTICIPANT_ENABLED and fail
// closed (503) while dark — the caller maps that to a deliberate "unavailable" state, not a crash.

const BASE = "participant/marketplace";

function unwrap<T>(body: unknown): T {
  const b = body as { data?: T } | undefined;
  return (b?.data ?? body) as T;
}

/** Structured, UI-safe view of a backend error (status + first message code). No stack traces. */
export interface MarketplaceError {
  status: number | null; // HTTP status (503 = feature disabled/upgrade, 401 = auth, 403 = ownership…)
  code: string; // backend message code, e.g. 'fulfilment_not_owned', 'acceptance_window_expired'
  message: string;
}

export function marketplaceError(err: unknown): MarketplaceError {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const status = e?.response?.status ?? null;
  const raw = e?.response?.data?.message;
  const code = Array.isArray(raw) ? raw[0] ?? "" : (raw ?? "");
  return { status, code: String(code), message: String(code || e?.message || "Unknown error") };
}

export const marketplaceParticipantService = {
  // ── Overview ──────────────────────────────────────────────────────────────
  async overview(): Promise<ParticipantOverview> {
    const { data } = await api.get(`${BASE}/overview`);
    return parseOverview(unwrap<Record<string, unknown>>(data) ?? {});
  },

  // ── Liquidity positions ────────────────────────────────────────────────────────
  async listPositions(): Promise<PositionView[]> {
    const { data } = await api.get(`${BASE}/liquidity-offers`);
    const rows = unwrap<Record<string, unknown>[]>(data) ?? [];
    return (Array.isArray(rows) ? rows : []).map(parsePosition);
  },
  async createPosition(input: {
    currency: string;
    declared_capacity: string;
    min_amount?: string;
    max_amount?: string;
    participant_cost_bps?: number;
    payout_method?: string;
    location_label?: string;
  }): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers`, input);
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async updatePosition(
    positionRef: string,
    input: {
      currency?: string;
      declared_capacity?: string;
      min_amount?: string;
      max_amount?: string;
      participant_cost_bps?: number;
      payout_method?: string;
      location_label?: string;
    }
  ): Promise<PositionView> {
    const { data } = await api.patch(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}`, input);
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async increasePosition(positionRef: string, amount: string): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}/increase`, { amount });
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async decreasePosition(positionRef: string, amount: string): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}/decrease`, { amount });
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async pausePosition(positionRef: string): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}/pause`, {});
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async resumePosition(positionRef: string): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}/resume`, {});
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async closePosition(positionRef: string): Promise<PositionView> {
    const { data } = await api.post(`${BASE}/liquidity-offers/${encodeURIComponent(positionRef)}/close`, {});
    return parsePosition(unwrap<Record<string, unknown>>(data) ?? {});
  },

  // ── Obligations ──────────────────────────────────────────────────────────────
  async listObligations(scope: "active" | "all" = "active"): Promise<ObligationView[]> {
    const { data } = await api.get(`${BASE}/fulfilments`, { params: { scope } });
    const rows = unwrap<Record<string, unknown>[]>(data) ?? [];
    return (Array.isArray(rows) ? rows : []).map(parseObligation);
  },
  async getObligation(ref: string): Promise<ObligationView> {
    const { data } = await api.get(`${BASE}/fulfilments/${encodeURIComponent(ref)}`);
    return parseObligation(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async acceptObligation(ref: string): Promise<ObligationView> {
    const { data } = await api.post(`${BASE}/fulfilments/${encodeURIComponent(ref)}/accept`, {});
    return parseObligation(unwrap<Record<string, unknown>>(data) ?? {});
  },
  async rejectObligation(ref: string, reasonCode: string): Promise<ObligationView> {
    const { data } = await api.post(`${BASE}/fulfilments/${encodeURIComponent(ref)}/reject`, { reason_code: reasonCode });
    return parseObligation(unwrap<Record<string, unknown>>(data) ?? {});
  },

  // Credential validation and handover confirmation are SEPARATE actions (never combined).
  async validateCode(ref: string, input: { code: string; qr_token?: string; expected_amount?: string }): Promise<StatusResult> {
    const { data } = await api.post(`${BASE}/fulfilments/${encodeURIComponent(ref)}/validate-code`, input);
    return unwrap<StatusResult>(data) ?? { status: "" };
  },
  async confirmHandover(ref: string): Promise<StatusResult> {
    const { data } = await api.post(`${BASE}/fulfilments/${encodeURIComponent(ref)}/confirm-handover`, {});
    return unwrap<StatusResult>(data) ?? { status: "" };
  },
  async openDispute(ref: string, reasonCode: string): Promise<StatusResult> {
    const { data } = await api.post(`${BASE}/fulfilments/${encodeURIComponent(ref)}/dispute`, { reason_code: reasonCode });
    return unwrap<StatusResult>(data) ?? { status: "" };
  },

  async evidenceTrail(ref: string): Promise<EvidenceTrailItem[]> {
    const { data } = await api.get(`${BASE}/fulfilments/${encodeURIComponent(ref)}/evidence`);
    const rows = unwrap<Record<string, unknown>[]>(data) ?? [];
    return (Array.isArray(rows) ? rows : []).map(parseEvidenceItem);
  },
  async receipt(ref: string): Promise<ParticipantReceipt> {
    const { data } = await api.get(`${BASE}/fulfilments/${encodeURIComponent(ref)}/receipt`);
    return parseReceipt(unwrap<Record<string, unknown>>(data) ?? {});
  },
};
