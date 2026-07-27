import { api } from "@/lib/api";
import { marketplaceError } from "@/services/marketplaceParticipantService";
import {
  LiquidityBreakdown,
  OpsAlert,
  OpsFunnel,
  OpsParticipant,
  OpsSearchRow,
  OpsSla,
  OpsSummary,
  OpsTimelineItem,
  Paged,
  TrendPoint,
  parseAlerts,
  parseFunnel,
  parseLiquidity,
  parseParticipants,
  parseSearch,
  parseSla,
  parseSummary,
  parseTimeline,
  parseTrend,
} from "@/types/marketplaceOps";

// M4A-4 · Operations Dashboard API client. Targets the gated `operations/marketplace/*` read surface.
// READ-ONLY — the dashboard never mutates anything. The backend is authoritative (no client recompute).
// Every route is gated by MARKETPLACE_OPERATOR_ENABLED (503 while dark).

const BASE = "operations/marketplace";
function unwrap<T>(body: unknown): T {
  const b = body as { data?: T } | undefined;
  return (b?.data ?? body) as T;
}
export { marketplaceError };

export const marketplaceOpsService = {
  async summary(): Promise<OpsSummary> { const { data } = await api.get(`${BASE}/summary`); return parseSummary(unwrap(data)); },
  async funnel(): Promise<OpsFunnel> { const { data } = await api.get(`${BASE}/funnel`); return parseFunnel(unwrap(data)); },
  async sla(): Promise<OpsSla> { const { data } = await api.get(`${BASE}/sla`); return parseSla(unwrap(data)); },
  async liquidity(): Promise<LiquidityBreakdown> { const { data } = await api.get(`${BASE}/liquidity`); return parseLiquidity(unwrap(data)); },
  async participants(page = 1, pageSize = 25): Promise<Paged<OpsParticipant>> {
    const { data } = await api.get(`${BASE}/participants`, { params: { page, pageSize } });
    return parseParticipants(unwrap(data));
  },
  async alerts(page = 1, pageSize = 25): Promise<{ page: number; page_size: number; items: OpsAlert[] }> {
    const { data } = await api.get(`${BASE}/alerts`, { params: { page, pageSize } });
    return parseAlerts(unwrap(data));
  },
  async timeline(limit = 50): Promise<OpsTimelineItem[]> {
    const { data } = await api.get(`${BASE}/timeline`, { params: { limit } });
    return parseTimeline(unwrap(data));
  },
  async search(q: { q?: string; participant?: number; city?: string; state?: string; reason?: string; from?: string; to?: string; limit?: number }): Promise<{ items: OpsSearchRow[]; total: number; limit: number }> {
    const { data } = await api.get(`${BASE}/search`, { params: q });
    return parseSearch(unwrap(data));
  },
  async trends(metric: string, bucket: string, days: number): Promise<TrendPoint[]> {
    const { data } = await api.get(`${BASE}/trends`, { params: { metric, bucket, days } });
    return parseTrend(unwrap(data));
  },
};
