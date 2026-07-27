// M4A-4 · Operations Dashboard helpers. Display-only. Empty-safe (no divide-by-zero / NaN). The
// backend is authoritative — these only format + classify what it returns.

import type { OpsFunnel, OpsAlert, OpsSla } from "@/types/marketplaceOps";
import type { StateTone } from "@/lib/marketplace";

/** Canonical funnel order (label + the funnel key it reads). */
export const FUNNEL_STEPS: Array<{ key: keyof OpsFunnel; label: string }> = [
  { key: "quotes_issued", label: "Quote" },
  { key: "quotes_accepted", label: "OTP / accepted" },
  { key: "reserves_created", label: "Reserve" },
  { key: "locks_acquired", label: "Lock" },
  { key: "participant_accepted", label: "Participant accepted" },
  { key: "credentials_verified", label: "Credential verified" },
  { key: "handovers_confirmed", label: "Cash handed over" },
  { key: "customer_receipts_confirmed", label: "Customer confirmed" },
  { key: "settled", label: "Settled" },
];

export interface FunnelRow { label: string; count: number; conversionPct: number | null; dropPct: number | null; }

/** Build funnel rows with empty-safe conversion + drop-off (null when the previous step is 0). */
export function funnelRows(f: OpsFunnel): FunnelRow[] {
  const rows: FunnelRow[] = [];
  let prev: number | null = null;
  const first = f[FUNNEL_STEPS[0].key];
  for (const step of FUNNEL_STEPS) {
    const count = f[step.key];
    const conversionPct = first > 0 ? Math.round((count / first) * 1000) / 10 : null;
    const dropPct = prev != null && prev > 0 ? Math.round(((prev - count) / prev) * 1000) / 10 : null;
    rows.push({ label: step.label, count, conversionPct, dropPct });
    prev = count;
  }
  return rows;
}

export type Severity = "critical" | "warning" | "info";
export function alertSeverity(a: OpsAlert): Severity {
  if (a.reason_code.includes("MISMATCH") || a.reason_code.includes("INCONSISTEN") || a.reason_code.includes("SETTLEMENT")) return "critical";
  if (a.human_review_required) return "warning";
  return "info";
}
export function severityTone(s: Severity): StateTone {
  return s === "critical" ? "bad" : s === "warning" ? "warn" : "info";
}

/** SLA rows with a green/warning/breached classification (breach thresholds in ms). */
export interface SlaRow { label: string; value: number; unit: "count" | "age"; tone: StateTone; status: "GREEN" | "WARNING" | "BREACHED" | "NONE"; }
const AGE_WARN = 1 * 3600_000; // 1h
const AGE_BREACH = 24 * 3600_000; // 24h
export function slaRows(s: OpsSla): SlaRow[] {
  const ageRow = (label: string, ms: number): SlaRow => {
    const status = ms === 0 ? "NONE" : ms >= AGE_BREACH ? "BREACHED" : ms >= AGE_WARN ? "WARNING" : "GREEN";
    const tone: StateTone = status === "BREACHED" ? "bad" : status === "WARNING" ? "warn" : status === "GREEN" ? "good" : "muted";
    return { label, value: ms, unit: "age", tone, status };
  };
  const countRow = (label: string, c: number): SlaRow => ({
    label, value: c, unit: "count", tone: c === 0 ? "good" : c >= 5 ? "bad" : "warn", status: c === 0 ? "GREEN" : c >= 5 ? "BREACHED" : "WARNING",
  });
  return [
    countRow("Participant acceptance timeouts", s.participant_timeout_count),
    countRow("Customer confirmation timeouts", s.customer_confirmation_timeout_count),
    countRow("Open disputes", s.open_disputes),
    ageRow("Oldest open dispute", s.oldest_open_dispute_age_ms),
    countRow("Open manual reviews", s.open_manual_reviews),
    ageRow("Oldest manual review", s.oldest_manual_review_age_ms),
  ];
}

/** Format a duration (ms) as a human age; 0 → "none". */
export function durationMs(ms: number): string {
  if (!ms || ms <= 0) return "none";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Compact integer formatting (thousands separators). */
export function fmtInt(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString();
}

/** Available liquidity is a signed decimal string — classify a "low liquidity" zone (available ≤ 0). */
export function isLowLiquidity(availableStr: string): boolean {
  const v = Number(availableStr);
  return Number.isFinite(v) && v <= 0;
}

export const TREND_METRICS: Array<{ key: string; label: string }> = [
  { key: "quotes", label: "Quotes" },
  { key: "settlements", label: "Settlements" },
  { key: "compensations", label: "Compensations" },
  { key: "disputes", label: "Disputes" },
];
export const TREND_BUCKETS: Array<{ key: string; label: string }> = [
  { key: "hour", label: "Hourly" },
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
];
