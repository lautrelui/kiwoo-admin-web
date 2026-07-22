import { api } from "@/lib/api";
import type { Transaction } from "@/types";

export interface TransactionFilters {
  userId?: number | string;
  partnerId?: number | string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const transactionService = {
  async list(filters: TransactionFilters = {}): Promise<{
    data: Transaction[];
    total?: number;
  }> {
    const { data } = await api.get<Transaction[] | { data: Transaction[]; total?: number }>(
      "admin/transactions",
      { params: filters }
    );
    if (Array.isArray(data)) return { data };
    return { data: data.data ?? [], total: data.total };
  },
  async get(id: number | string): Promise<Transaction> {
    const { data } = await api.get<Transaction>(`admin/transactions/${id}`);
    return data;
  },
};
