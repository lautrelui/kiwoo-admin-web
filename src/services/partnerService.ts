import { api } from "@/lib/api";
import type { Partner, Transaction } from "@/types";

export interface CreatePartnerPayload {
  name: string;
  type: "LEH" | "CORPORATION" | "PARTNER" | string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface AssignMuxedPayload {
  partnerId: number | string;
  muxedAccount: string;
}

export interface SetRatePayload {
  partnerId: number | string;
  rate: number;
  effectiveAt?: string;
  notes?: string;
}

export const partnerService = {
  async list(): Promise<Partner[]> {
    const { data } = await api.get<Partner[] | { data: Partner[] }>("admin/partners");
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async create(payload: CreatePartnerPayload) {
    const { data } = await api.post<Partner>("admin/partners", payload);
    return data;
  },
  async assignMuxed(payload: AssignMuxedPayload) {
    const { data } = await api.post(`admin/partners/${payload.partnerId}/muxed`, payload);
    return data;
  },
  async setRate(payload: SetRatePayload) {
    const { data } = await api.post(`admin/partners/${payload.partnerId}/rate`, payload);
    return data;
  },
  async currentRate(partnerId: number | string) {
    const { data } = await api.get<{ rate: number; effectiveAt?: string }>(
      `admin/partners/${partnerId}/rate`
    );
    return data;
  },
  async transactions(partnerId: number | string): Promise<Transaction[]> {
    const { data } = await api.get<Transaction[] | { data: Transaction[] }>(
      `admin/partners/${partnerId}/transactions`
    );
    return Array.isArray(data) ? data : data.data ?? [];
  },
};
