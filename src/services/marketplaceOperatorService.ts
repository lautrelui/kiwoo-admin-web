import { api } from "@/lib/api";
import { marketplaceError } from "@/services/marketplaceParticipantService";
import {
  AdjudicationPreview,
  OperatorCaseContext,
  OperatorReviewQueueItem,
  ProposalActionResult,
  parseCaseContext,
  parseQueue,
} from "@/types/marketplaceOperator";

// M4A-3 · operator adjudication console API client. Targets the canonical `operator/marketplace/*`
// routes (NOT participant/customer routes). Operator identity is resolved SERVER-SIDE from the JWT —
// this client NEVER sends operator/participant/customer id, amount, account, or settlement state as an
// authority-bearing field. Every write is gated by MARKETPLACE_OPERATOR_ENABLED (503 while dark).

const BASE = "operator/marketplace";

function unwrap<T>(body: unknown): T {
  const b = body as { data?: T } | undefined;
  return (b?.data ?? body) as T;
}

export { marketplaceError };

export interface ReviewFilters {
  reason?: string;
  state?: string;
  origin?: string;
  participant?: number;
  from?: string;
  to?: string;
  adjudication?: "pending" | "adjudicated";
  limit?: number;
  offset?: number;
}

export const marketplaceOperatorService = {
  async reviews(filters: ReviewFilters = {}): Promise<{ items: OperatorReviewQueueItem[]; total: number; limit: number; offset: number }> {
    const { data } = await api.get(`${BASE}/reviews`, { params: filters });
    return parseQueue(unwrap(data));
  },
  async caseContext(ref: string): Promise<OperatorCaseContext> {
    const { data } = await api.get(`${BASE}/reviews/${encodeURIComponent(ref)}`);
    return parseCaseContext(unwrap(data));
  },
  async preview(ref: string, decision: "SETTLE" | "COMPENSATE"): Promise<AdjudicationPreview> {
    const { data } = await api.get(`${BASE}/reviews/${encodeURIComponent(ref)}/preview`, { params: { decision } });
    return unwrap<AdjudicationPreview>(data);
  },
  async addNote(ref: string, input: { category: string; note: string; idempotency_key: string }): Promise<{ status: string }> {
    const { data } = await api.post(`${BASE}/reviews/${encodeURIComponent(ref)}/note`, input);
    return unwrap(data);
  },
  async propose(ref: string, input: { decision: "SETTLE" | "COMPENSATE"; reason: string; note: string }): Promise<ProposalActionResult> {
    const { data } = await api.post(`${BASE}/reviews/${encodeURIComponent(ref)}/propose`, input);
    return unwrap<ProposalActionResult>(data);
  },
  async approve(proposalId: string, resolution_note?: string): Promise<ProposalActionResult> {
    const { data } = await api.post(`${BASE}/proposals/${encodeURIComponent(proposalId)}/approve`, { resolution_note });
    return unwrap<ProposalActionResult>(data);
  },
  async reject(proposalId: string, resolution_note?: string): Promise<ProposalActionResult> {
    const { data } = await api.post(`${BASE}/proposals/${encodeURIComponent(proposalId)}/reject`, { resolution_note });
    return unwrap<ProposalActionResult>(data);
  },
};
