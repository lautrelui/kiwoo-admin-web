import { api } from "@/lib/api";

// Kiwoo's success wrapper nests the payload under `data`. Unwrap defensively.
function unwrap<T>(body: any): T {
  return (body?.data ?? body) as T;
}

export type FloatTopUpStatus =
  | "REQUESTED"
  | "APPROVED"
  | "EXECUTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface AgentFloat {
  agent_user_id: number;
  asset_code: string;
  float_balance: string;
  max_cash_in: string;
  as_of: string;
}

export interface FloatTopUp {
  reference: string;
  agent_user_id: number;
  amount: string;
  asset_code: string;
  reason: string;
  status: FloatTopUpStatus;
  requested_by: number;
  requested_at: string;
  approved_by: number | null;
  approved_at: string | null;
  executed_by: number | null;
  executed_at: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  rejection_note: string | null;
  cancelled_by: number | null;
  cancelled_at: string | null;
  expires_at: string | null;
  journal_ref: number | null;
  float_before: string | null;
  float_after: string | null;
}

export interface FloatPolicy {
  enabled: boolean;
  currency: string;
  min_amount: string;
  max_per_request: string;
  daily_max_per_agent: string;
  four_eyes_required: boolean;
}

const AGENTS = "admin/cash-agents";
const TOPUPS = "admin/cash-agent-float-topups";

export const agentFloatService = {
  async getFloat(agentRef: string | number): Promise<AgentFloat> {
    const { data } = await api.get(`${AGENTS}/${agentRef}/float`);
    return unwrap<AgentFloat>(data);
  },
  async list(agentRef: string | number): Promise<FloatTopUp[]> {
    const { data } = await api.get(`${AGENTS}/${agentRef}/float-topups`);
    return unwrap<FloatTopUp[]>(data) ?? [];
  },
  async policy(): Promise<FloatPolicy> {
    const { data } = await api.get(`${TOPUPS}/policy`);
    return unwrap<FloatPolicy>(data);
  },
  async create(agentRef: string | number, payload: { amount: string; reason: string }): Promise<FloatTopUp> {
    const { data } = await api.post(`${AGENTS}/${agentRef}/float-topups`, payload);
    return unwrap<FloatTopUp>(data);
  },
  async approve(ref: string): Promise<FloatTopUp> {
    const { data } = await api.post(`${TOPUPS}/${ref}/approve`, {});
    return unwrap<FloatTopUp>(data);
  },
  async execute(ref: string): Promise<FloatTopUp> {
    const { data } = await api.post(`${TOPUPS}/${ref}/execute`, {});
    return unwrap<FloatTopUp>(data);
  },
  async reject(ref: string, note?: string): Promise<FloatTopUp> {
    const { data } = await api.post(`${TOPUPS}/${ref}/reject`, { note });
    return unwrap<FloatTopUp>(data);
  },
  async cancel(ref: string): Promise<FloatTopUp> {
    const { data } = await api.post(`${TOPUPS}/${ref}/cancel`, {});
    return unwrap<FloatTopUp>(data);
  },
};
