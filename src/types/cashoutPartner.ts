// Cash-out Partner admin types — mirror the backend's enriched projection exactly. Non-execution.

export type PartnerStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INFORMATION_REQUIRED"
  | "APPROVED"
  | "PARTICIPANT_PROVISIONED"
  | "MARKETPLACE_ACTIVE"
  | "REJECTED"
  | "SUSPENDED"
  | "INACTIVE";

export type PartnerAvailability =
  | "AVAILABLE"
  | "OFFLINE"
  | "ELIGIBLE"
  | "SUSPENDED"
  | "NOT_ELIGIBLE";

export interface PartnerUser {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  wallet_id?: string | null;
}

export interface PartnerCompliance {
  kyc_tier?: string | null;
  account_standing: string;
  trust_band?: string | null;
  open_risk_flags: number;
  previous_disputes: number;
  marketplace_activity: boolean;
}

export interface PartnerApplication {
  id: number;
  user_id: number;
  status: PartnerStatus;
  display_name?: string | null;
  business_name?: string | null;
  contact_phone?: string | null;
  preferred_contact?: string | null;
  operating_city?: string | null;
  neighborhood?: string | null;
  languages: string[];
  photo_url?: string | null;
  operating_days: string[];
  operating_hours_start?: string | null;
  operating_hours_end?: string | null;
  emergency_unavailable: boolean;
  is_online: boolean;
  typical_cash_available?: string | null;
  min_payout?: string | null;
  max_payout?: string | null;
  payout_methods: string[];
  requirements_ack: boolean;
  terms_accepted: boolean;
  terms_version?: string | null;
  submitted_at?: string | null;
  assigned_reviewer?: number | null;
  assigned_at?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  provisioned_at?: string | null;
  activated_at?: string | null;
  suspended_at?: string | null;
  created_at: string;
  updated_at: string;
  availability: PartnerAvailability;
  user: PartnerUser;
  compliance: PartnerCompliance;
}

export interface PartnerStats {
  current_requests: number;
  completed_requests: number;
  completed_payouts: string;
  acceptance_rate: number | null;
  avg_response_time_seconds: number | null;
  customer_disputes: number;
  customer_confirmations: number;
  marketplace_activity: boolean;
}

export interface PartnerDirectoryItem extends PartnerApplication {
  stats: PartnerStats;
}

export interface PartnerNote {
  id: number;
  body: string;
  created_at: string;
  author_id: number;
  author_name: string;
}

export interface PartnerTimelineEvent {
  at: string;
  code: string;
  label: string;
  actor: string | null;
  detail: string | null;
}

export interface PartnerDashboard {
  applications_pending: number;
  applications_today: number;
  avg_approval_seconds: number | null;
  eligible_partners: number;
  available_partners: number;
  suspended_partners: number;
}

/** The console decision actions valid for a given status (mirrors the backend state machine). */
export type PartnerAction =
  | "assign"
  | "start-review"
  | "request-info"
  | "approve"
  | "reject"
  | "provision"
  | "activate"
  | "suspend"
  | "deactivate";

export function allowedActions(status: PartnerStatus): PartnerAction[] {
  switch (status) {
    case "SUBMITTED":
      return ["assign", "start-review", "request-info", "approve", "reject", "deactivate"];
    case "UNDER_REVIEW":
      return ["assign", "request-info", "approve", "reject", "deactivate"];
    case "INFORMATION_REQUIRED":
      return ["assign", "reject", "deactivate"];
    case "APPROVED":
      return ["provision", "suspend", "deactivate"];
    case "PARTICIPANT_PROVISIONED":
      return ["activate", "suspend", "deactivate"];
    case "MARKETPLACE_ACTIVE":
      return ["suspend", "deactivate"];
    case "SUSPENDED":
      return ["deactivate"];
    default:
      return []; // DRAFT / REJECTED / INACTIVE — nothing actionable
  }
}
