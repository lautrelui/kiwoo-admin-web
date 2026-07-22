import { api } from "@/lib/api";
import type { AmlFlag, KycRecord } from "@/types";

export interface KycReviewPayload {
  userId: number | string;
  notes?: string;
}

export const kycService = {
  async listPending(): Promise<KycRecord[]> {
    // Backend exposes /kyc/status per-user; the admin pending-list endpoint
    // is expected at /admin/kyc/pending. See README for the missing-endpoint list.
    const { data } = await api.get<KycRecord[] | { data: KycRecord[] }>("admin/kyc/pending");
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async approve(payload: KycReviewPayload) {
    const { data } = await api.post("admin/kyc/approve", payload);
    return data;
  },
  async reject(payload: KycReviewPayload) {
    const { data } = await api.post("admin/kyc/reject", payload);
    return data;
  },
  async amlFlags(): Promise<AmlFlag[]> {
    const { data } = await api.get<AmlFlag[] | { data: AmlFlag[] }>("admin/aml/flags");
    return Array.isArray(data) ? data : data.data ?? [];
  },
};
