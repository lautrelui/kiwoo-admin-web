import { api } from "@/lib/api";
import type { JournalDetail, JournalSummary } from "@/types";

export interface JournalFilters {
  sourceType?: string;
  reference?: string;
  createdBy?: number | string;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

interface RawJournalListResponse {
  items: JournalSummary[];
  total: number;
  take: number;
  skip: number;
}

/// Ledger-first Transactions view. All Kiwoo money movements land as
/// balanced double-entry JournalEntry rows on the backend; this service
/// wraps `GET /ledger/journals` (list) + `GET /ledger/journal/:id`
/// (detail with legs) for the admin UI.
export const ledgerService = {
  async listJournals(
    filters: JournalFilters = {},
  ): Promise<{
    data: JournalSummary[];
    total: number;
    take: number;
    skip: number;
  }> {
    const params: Record<string, string> = {};
    if (filters.sourceType) params.source_type = filters.sourceType;
    if (filters.reference) params.reference = filters.reference;
    if (filters.createdBy != null && filters.createdBy !== "")
      params.created_by = String(filters.createdBy);
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.take != null) params.take = String(filters.take);
    if (filters.skip != null) params.skip = String(filters.skip);

    const { data } = await api.get<RawJournalListResponse>("ledger/journals", {
      params,
    });
    return {
      data: Array.isArray(data?.items) ? data.items : [],
      total: data?.total ?? 0,
      take: data?.take ?? 50,
      skip: data?.skip ?? 0,
    };
  },
  async getJournal(id: number | string): Promise<JournalDetail> {
    const { data } = await api.get<JournalDetail>(`ledger/journal/${id}`);
    return data;
  },
};
