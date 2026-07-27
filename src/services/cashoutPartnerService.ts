import { api } from "@/lib/api";
import type {
  PartnerApplication,
  PartnerDashboard,
  PartnerDirectoryItem,
  PartnerNote,
  PartnerTimelineEvent,
} from "@/types/cashoutPartner";

// Kiwoo's successWrapper nests the payload under `data`. Unwrap defensively.
function unwrap<T>(body: any): T {
  return (body?.data ?? body) as T;
}

export interface ApplicationsQuery {
  status?: string;
  search?: string;
  city?: string;
  reviewer?: number;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

const BASE = "admin/marketplace/partner";

export const cashoutPartnerService = {
  async dashboard(): Promise<PartnerDashboard> {
    const { data } = await api.get(`${BASE}/dashboard`);
    return unwrap<PartnerDashboard>(data);
  },

  async listApplications(q: ApplicationsQuery = {}): Promise<{ total: number; items: PartnerApplication[] }> {
    const { data } = await api.get(`${BASE}/applications`, { params: clean(q) });
    return unwrap<{ total: number; items: PartnerApplication[] }>(data);
  },

  async getApplication(id: number): Promise<PartnerApplication> {
    const { data } = await api.get(`${BASE}/applications/${id}`);
    return unwrap<{ application: PartnerApplication }>(data).application;
  },

  async timeline(id: number): Promise<PartnerTimelineEvent[]> {
    const { data } = await api.get(`${BASE}/applications/${id}/timeline`);
    return unwrap<{ events: PartnerTimelineEvent[] }>(data).events ?? [];
  },

  async listNotes(id: number): Promise<PartnerNote[]> {
    const { data } = await api.get(`${BASE}/applications/${id}/notes`);
    return unwrap<{ notes: PartnerNote[] }>(data).notes ?? [];
  },

  async addNote(id: number, body: string): Promise<PartnerNote> {
    const { data } = await api.post(`${BASE}/applications/${id}/notes`, { body });
    return unwrap<{ note: PartnerNote }>(data).note;
  },

  async assign(id: number, reviewerId: number): Promise<PartnerApplication> {
    const { data } = await api.post(`${BASE}/applications/${id}/assign`, { reviewer_id: reviewerId });
    return unwrap<{ application: PartnerApplication }>(data).application;
  },

  /** Lifecycle decision. `action` is a valid backend route segment; `note`/`message` optional. */
  async decide(id: number, action: string, payload?: { note?: string; message?: string }): Promise<PartnerApplication> {
    const { data } = await api.post(`${BASE}/applications/${id}/${action}`, payload ?? {});
    return unwrap<{ application: PartnerApplication }>(data).application;
  },

  async listPartners(q: ApplicationsQuery = {}): Promise<{ total: number; items: PartnerDirectoryItem[] }> {
    const { data } = await api.get(`${BASE}/partners`, { params: clean(q) });
    return unwrap<{ total: number; items: PartnerDirectoryItem[] }>(data);
  },

  async getPartner(id: number): Promise<PartnerDirectoryItem> {
    const { data } = await api.get(`${BASE}/partners/${id}`);
    return unwrap<{ partner: PartnerDirectoryItem }>(data).partner;
  },
};

function clean(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}
