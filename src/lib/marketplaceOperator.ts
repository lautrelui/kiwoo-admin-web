// M4A-3 · operator-console display helpers. No business logic — Kiwoo is authoritative for eligibility,
// amounts, accounts, and the terminal transition.

import type { FourEyesStatus, SlaStatus } from "@/types/marketplaceOperator";
import type { StateTone } from "@/lib/marketplace";

/** Queue presets = the operator nav sub-sections, each mapping to server-backed filters. */
export type QueuePreset =
  | "all"
  | "disputes"
  | "timeouts"
  | "conflicts"
  | "reconciliation"
  | "awaiting-approval"
  | "adjudicated";

export const PRESET_META: Record<QueuePreset, { title: string; subtitle: string; filters: Record<string, string>; clientFourEyes?: FourEyesStatus }> = {
  all: { title: "Review queue", subtitle: "All cases awaiting operator review", filters: { adjudication: "pending" } },
  disputes: { title: "Open disputes", subtitle: "Cases with an open party dispute", filters: { adjudication: "pending", state: "MANUAL_REVIEW_REQUIRED" } },
  timeouts: { title: "Customer-confirmation timeouts", subtitle: "Customer did not confirm in time", filters: { adjudication: "pending", state: "CUSTOMER_CONFIRMATION_TIMEOUT" } },
  conflicts: { title: "Evidence conflicts", subtitle: "Conflicting evidence needs human review", filters: { adjudication: "pending", reason: "CONFLICT" } },
  reconciliation: { title: "Reconciliation exceptions", subtitle: "Reconciler-flagged inconsistencies", filters: { adjudication: "pending", reason: "RECON" } },
  "awaiting-approval": { title: "Awaiting second approval", subtitle: "Proposals pending a second operator", filters: { adjudication: "pending" }, clientFourEyes: "SECOND_APPROVAL_PENDING" },
  adjudicated: { title: "Adjudicated cases", subtitle: "Cases with a final decision", filters: { adjudication: "adjudicated" } },
};

/** Review-reason vocabulary (safe, bounded) → human label. */
export const REVIEW_REASON_LABEL: Record<string, string> = {
  DISPUTE: "Party dispute",
  MANUAL_REVIEW_REQUIRED: "Manual review",
  CUSTOMER_DENIES_RECEIPT: "Customer denied receipt",
  CUSTOMER_CONFIRMATION_TIMEOUT: "Customer confirmation timeout",
  ROUTINE_CHECK: "Routine check",
};

export function reviewReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "—";
  return REVIEW_REASON_LABEL[reason] ?? reason;
}

/** Operator note categories (curated client list — the backend accepts a free-form category). */
export const NOTE_CATEGORIES: Array<{ code: string; label: string }> = [
  { code: "INVESTIGATION", label: "Investigation" },
  { code: "CONTACT", label: "Contacted a party" },
  { code: "EVIDENCE", label: "Evidence observation" },
  { code: "DECISION_RATIONALE", label: "Decision rationale" },
  { code: "GENERAL", label: "General" },
];

/** Adjudication reason codes (curated). */
export const ADJUDICATION_REASONS: Array<{ code: string; label: string }> = [
  { code: "EVIDENCE_SUPPORTS_HANDOVER", label: "Evidence supports handover" },
  { code: "CUSTOMER_CONFIRMED_LATE", label: "Customer confirmed late" },
  { code: "NO_HANDOVER_OCCURRED", label: "No handover occurred" },
  { code: "PARTICIPANT_AT_FAULT", label: "Participant at fault" },
  { code: "CUSTOMER_AT_FAULT", label: "Customer at fault" },
  { code: "INCONCLUSIVE_FAVOUR_CUSTOMER", label: "Inconclusive — favour customer" },
];

export const FOUR_EYES_LABEL: Record<FourEyesStatus, string> = {
  NONE: "—",
  SINGLE_APPROVAL_PERMITTED: "Single approval permitted",
  SECOND_APPROVAL_REQUIRED: "Second approval required",
  SECOND_APPROVAL_PENDING: "Second approval pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function fourEyesTone(s: FourEyesStatus): StateTone {
  if (s === "APPROVED") return "good";
  if (s === "SECOND_APPROVAL_PENDING") return "warn";
  if (s === "REJECTED") return "bad";
  if (s === "SECOND_APPROVAL_REQUIRED") return "info";
  return "muted";
}

export function slaTone(s: SlaStatus): StateTone {
  if (s === "BREACHED") return "bad";
  if (s === "AT_RISK") return "warn";
  if (s === "ON_TIME") return "good";
  return "muted";
}

export function ageText(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
