import { api } from "@/lib/api";

export interface FundableAgreement {
  agreement_id: number;
  agreement_ref: string;
  status: string;
  borrower: { id: number; name: string | null };
  lender: { id: number; name: string | null };
  amount: string | null;
  currency: string | null;
  both_signed: boolean;
  existing_funding: { id: number; status: string } | null;
}

export interface FundingRow {
  id: number;
  funding_ref: string;
  status: string;
  agreement_id: number;
  loan_request_id: number;
  lender_id: number;
  borrower_id: number;
  principal: string;
  initiated_by: number;
  approved_by: number | null;
  stellar_tx_hash: string | null;
  ledger_journal_id: number | null;
  reconcile_reason: string | null;
}

// Admin four-eyes funding. request (admin A) → approve (admin B ≠ A) → execute.
// The backend enforces `four_eyes_self_approval_forbidden`; the UI mirrors it.
export const loanFundingService = {
  async fundable(): Promise<FundableAgreement[]> {
    const { data } = await api.get<{ items: FundableAgreement[] }>("admin/loans/agreements/fundable");
    return data.items;
  },
  async list(status?: string): Promise<FundingRow[]> {
    const { data } = await api.get<{ items: FundingRow[] }>("admin/loans/funding", {
      params: status ? { status } : {},
    });
    return data.items;
  },
  async request(agreementId: number, idempotency_key: string, note?: string) {
    const { data } = await api.post(`admin/loans/agreements/${agreementId}/funding/request`, {
      idempotency_key,
      note,
    });
    return data;
  },
  async approve(fundingId: number, reason?: string) {
    const { data } = await api.post(`admin/loans/funding/${fundingId}/approve`, { reason });
    return data;
  },
  async execute(fundingId: number) {
    const { data } = await api.post(`admin/loans/funding/${fundingId}/execute`, {});
    return data as FundingRow;
  },
};
