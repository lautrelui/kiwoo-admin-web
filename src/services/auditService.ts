import { api } from "@/lib/api";
import type { AuditLog } from "@/types";

/// Backend `/admin/audit-logs` accepts snake_case query params (see
/// `src/audit/audit.controller.ts:21`). Frontend keeps camelCase in the
/// UI for continuity and maps at the wire boundary.
export interface AuditFilters {
  eventType?: string;
  actorId?: number | string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  take?: number;
  skip?: number;
}

interface RawAuditListResponse {
  items: AuditLog[];
  total: number;
  take: number;
  skip: number;
}

export const auditService = {
  async list(
    filters: AuditFilters = {},
  ): Promise<{ data: AuditLog[]; total: number; take: number; skip: number }> {
    const params: Record<string, string> = {};
    if (filters.eventType) params.event_type = filters.eventType;
    if (filters.actorId != null && filters.actorId !== "")
      params.actor_id = String(filters.actorId);
    if (filters.targetType) params.target_type = filters.targetType;
    if (filters.targetId) params.target_id = filters.targetId;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.take != null) params.take = String(filters.take);
    if (filters.skip != null) params.skip = String(filters.skip);

    const { data } = await api.get<RawAuditListResponse>("admin/audit-logs", {
      params,
    });
    return {
      data: Array.isArray(data?.items) ? data.items : [],
      total: data?.total ?? 0,
      take: data?.take ?? 50,
      skip: data?.skip ?? 0,
    };
  },
};

/// Canonical `AuditEventType` values from `prisma/schema.prisma`. Keep
/// this list in sync with the enum — new event types added on the
/// backend should be appended here so operators can filter on them.
export const AUDIT_EVENT_TYPES = [
  "login_success",
  "login_failure",
  "password_change",
  "pin_change",
  "kyc_submitted",
  "kyc_approved",
  "kyc_rejected",
  "wallet_created",
  "wallet_frozen",
  "wallet_unfrozen",
  "treasury_mint",
  "treasury_burn",
  "transfer",
  "cash_in",
  "cash_out",
  "merchant_payment",
  "rate_change",
  "admin_action",
  "aml_flag",
  "agent_approved",
  "agent_commission_updated",
  "merchant_approved",
  "partner_created",
  "partner_muxed_assigned",
  "partner_rate_changed",
  "transaction_reviewed",
  "ledger_posted",
  "mint_requested",
  "mint_approved",
  "mint_executed",
  "mint_rejected",
  "burn_requested",
  "burn_approved",
  "burn_executed",
  "burn_rejected",
  "partner_quote_created",
  "partner_tx_executed",
  "settlement_generated",
  "settlement_approved",
  "settlement_executed",
  "lottery_ticket_purchased",
  "lottery_prize_paid",
  "reconciliation_run",
  "reconciliation_alert",
  "wallet_balance_recomputed",
  "stellar_tx_submitted",
  "stellar_tx_confirmed",
  "aml_review_required",
  "ledger_backfilled",
  "kms_key_rotated",
  "cash_out_requested",
  "cash_out_assigned",
  "cash_out_accepted",
  "cash_out_completed",
  "cash_out_cancelled",
  "cash_out_failed",
  "agent_liquidity_updated",
  "stellar_supply_validated",
  "compliance_export",
  "relationship_edit",
  "trusted_recipient_change",
  "schedule_create",
  "schedule_update",
  "schedule_delete",
  "life_event_create",
  "business_profile_edit",
  "business_catalog_edit",
  "business_approved_by_admin",
  "payment_request_created",
  "payment_request_presented",
  "payment_request_paid",
] as const;
