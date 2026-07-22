import { api } from "@/lib/api";
import type { Agent, Transaction } from "@/types";

export interface ApproveAgentPayload {
  agentId: number | string;
  notes?: string;
}

export interface UpdateCommissionPayload {
  agentId: number | string;
  cashInCommission?: number;
  cashOutCommission?: number;
}

export const agentService = {
  async list(): Promise<Agent[]> {
    const { data } = await api.get<Agent[] | { data: Agent[] }>("admin/agents");
    return Array.isArray(data) ? data : data.data ?? [];
  },
  async approve(payload: ApproveAgentPayload) {
    const { data } = await api.post(`admin/agents/${payload.agentId}/approve`, payload);
    return data;
  },
  async updateCommission(payload: UpdateCommissionPayload) {
    const { data } = await api.patch(`admin/agents/${payload.agentId}/commissions`, payload);
    return data;
  },
  async getLiquidity(agentId: number | string) {
    const { data } = await api.get(`admin/agents/${agentId}/liquidity`);
    return data;
  },
  async cashActivity(agentId: number | string): Promise<Transaction[]> {
    const { data } = await api.get<Transaction[] | { data: Transaction[] }>(
      `admin/agents/${agentId}/activity`
    );
    return Array.isArray(data) ? data : data.data ?? [];
  },
};
