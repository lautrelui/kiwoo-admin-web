export type Role =
  | "ADMIN"
  | "SUPER_ADMIN"
  | "TREASURY"
  | "COMPLIANCE"
  | "VIEWER"
  // M4A-2 · Marketplace participant tenancy (Corp/LEH/merchant/approved liquidity provider).
  | "PARTICIPANT"
  | "CORP"
  | "LEH"
  | "MERCHANT_PARTICIPANT"
  | string;

export interface AdminUser {
  id: number | string;
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
  roles?: Role[];
}

export interface AuthResponse {
  token?: string;
  access_token?: string;
  accessToken?: string;
  user?: AdminUser;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface TreasuryStatus {
  assetCode: string;
  issuerPublicKey?: string;
  distributionPublicKey?: string;
  circulatingSupply: number | string;
  reserveBalance?: number | string;
  backingRatio?: number;
  network?: string;
  lastUpdated?: string;
}

export interface ReserveReport {
  asOf?: string;
  total?: number | string;
  entries?: Array<{
    account?: string;
    label?: string;
    balance: number | string;
    currency?: string;
  }>;
}

export interface KycRecord {
  id: number | string;
  userId: number | string;
  userName?: string;
  phone?: string;
  email?: string;
  tier?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  submittedAt?: string;
  documents?: Array<{ type: string; url?: string }>;
}

export interface AmlFlag {
  id: number | string;
  userId?: number | string;
  transactionId?: number | string;
  reason: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  status?: string;
  createdAt?: string;
}

export interface Agent {
  id: number | string;
  name: string;
  phone?: string;
  status?: string;
  liquidity?: number | string;
  cashInCommission?: number;
  cashOutCommission?: number;
  rating?: number;
  createdAt?: string;
}

export interface Merchant {
  id: number | string;
  businessName: string;
  ownerName?: string;
  phone?: string;
  category?: string;
  status?: string;
  totalSales?: number | string;
  settlementBalance?: number | string;
  createdAt?: string;
}

export interface Partner {
  id: number | string;
  name: string;
  type: "LEH" | "CORPORATION" | "PARTNER" | string;
  muxedAccount?: string;
  rate?: number;
  status?: string;
  createdAt?: string;
}

/// Legacy Transaction type — the `Transactions` model in Prisma is
/// dead in prod (all money movements go through the Ledger). This
/// interface remains for the per-entity Transactions sub-tabs on
/// Agents, Partners, Merchants pages, which still call their legacy
/// per-entity endpoints (returning [] today, harmless).
export interface Transaction {
  id: number | string;
  reference?: string;
  type?: string;
  amount: number | string;
  assetCode?: string;
  fee?: number | string;
  status: string;
  senderId?: number | string;
  receiverId?: number | string;
  partnerId?: number | string;
  stellarTxHash?: string;
  exchangeRate?: number;
  createdAt?: string;
}

/// Ledger journal summary — matches the backend `/ledger/journals` list
/// item shape. The full leg list comes from `/ledger/journal/:id`.
export interface JournalSummary {
  id: number;
  description: string;
  reference: string | null;
  source_type: string | null;
  source_id: string | null;
  created_by: number | null;
  correlation_id: string | null;
  is_backfilled: boolean;
  created_at: string;
  leg_count: number;
  /// Balanced double-entry post — this equals the total debit side,
  /// which equals the total credit side.
  net_amount: string;
  currency: string | null;
}

/// One leg of a journal, returned by `/ledger/journal/:id` via the
/// `entries` field.
export interface JournalLeg {
  id: number;
  account_id: number;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  currency: string;
  memo: string | null;
  account?: {
    id: number;
    code: string;
    name: string;
    type: string;
    normal_balance: "DEBIT" | "CREDIT";
    currency: string;
  };
}

export interface JournalDetail extends JournalSummary {
  entries: JournalLeg[];
}

/// AuditLog — mirrors the backend `AuditLog` row shape. snake_case
/// throughout to match `/admin/audit-logs` items — the admin UI does
/// NOT rename these fields on the wire.
export interface AuditLog {
  id: number | string;
  event_type: string;
  actor_id: number | null;
  target_type: string | null;
  target_id: string | null;
  ip: string | null;
  user_agent: string | null;
  device: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
