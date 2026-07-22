import { api } from "@/lib/api";
import type { Merchant, Transaction } from "@/types";

export const merchantService = {
  async list(): Promise<Merchant[]> {
    const { data } = await api.get<Merchant[] | { data: Merchant[] }>("admin/merchants");
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async transactions(merchantId: number | string): Promise<Transaction[]> {
    const { data } = await api.get<Transaction[] | { data: Transaction[] }>(
      `admin/merchants/${merchantId}/transactions`
    );
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async qrPaymentRequests(merchantId: number | string) {
    const { data } = await api.get(`admin/merchants/${merchantId}/qr-requests`);
    return data;
  },
  async settlementStatus(merchantId: number | string) {
    const { data } = await api.get(`admin/merchants/${merchantId}/settlement`);
    return data;
  },
};
