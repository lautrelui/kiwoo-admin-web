import { api } from "@/lib/api";
import type {
  AdminUserDetail,
  AdminUserListResponse,
} from "@/types/intelligence";

/**
 * Cross-user directory client for the Operations Center.
 *
 * Sprint 13 Task 126.5 — pairs with the read-only
 * `/admin/users` endpoint that lists sanitized user summaries and
 * returns a fuller detail DTO by id. The backend is the enforcement
 * point for what's masked (pin, hash_password, privateKey never
 * cross the wire) — the frontend simply renders what it's given.
 */
export interface UserFilters {
  q?: string;
  role?: string;
  kyc_tier?: string;
  is_frozen?: boolean;
  has_wallet?: boolean;
  page?: number;
  limit?: number;
}

export const userService = {
  async list(filters: UserFilters = {}): Promise<AdminUserListResponse> {
    const params: Record<string, string> = {};
    if (filters.q) params.q = filters.q;
    if (filters.role) params.role = filters.role;
    if (filters.kyc_tier) params.kyc_tier = filters.kyc_tier;
    if (typeof filters.is_frozen === "boolean")
      params.is_frozen = String(filters.is_frozen);
    if (typeof filters.has_wallet === "boolean")
      params.has_wallet = String(filters.has_wallet);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    const { data } = await api.get<AdminUserListResponse>("admin/users", {
      params,
    });
    return data;
  },
  async detail(id: number | string): Promise<{ user: AdminUserDetail }> {
    const { data } = await api.get<{ user: AdminUserDetail }>(
      `admin/users/${id}`,
    );
    return data;
  },
};
