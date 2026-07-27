import { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  LIQUIDITY_CONCEPTS,
  StateTone,
  TEST_TRANSACTION_NOTICE,
  formatMoney,
  stateInfo,
} from "@/lib/marketplace";
import type { FeatureAvailability } from "@/lib/marketplaceHooks";

// M4A-2 · presentational atoms for the participant Marketplace surface. No business logic; every
// money value is a server-authoritative string rendered verbatim.

const TONE_CLASS: Record<StateTone, string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  muted: "bg-ink-100 text-ink-700 border-ink-200",
};

/** Canonical-state badge (label + tone from the state map; unknown → muted "Status unavailable"). */
export function StateBadge({ state, className }: { state: string; className?: string }) {
  const info = stateInfo(state);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[info.tone],
        className
      )}
      title={info.hint}
    >
      {info.label}
    </span>
  );
}

/**
 * The MANDATORY per-screen TEST notice. Renders the backend-provided string when present (falls back
 * to the canonical constant), exposed as a labelled note so it is not conveyed by colour alone.
 * Renders nothing when there is no notice (non-TEST environment).
 */
export function TestNotice({ notice, className }: { notice?: string | null; className?: string }) {
  const text = notice && notice.trim() ? notice : null;
  if (!text) return null;
  return (
    <div
      role="note"
      aria-label="Test transaction notice"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800",
        className
      )}
    >
      <span aria-hidden>⚠</span>
      <span>{text}</span>
    </div>
  );
}

/** A global environment TEST banner (supplementary to — never a replacement for — per-screen notices). */
export function EnvTestBanner() {
  const label = (import.meta.env.VITE_ENV_LABEL || "development").toString();
  const isMain = ["production", "prod", "mainnet", "public"].includes(label.toLowerCase());
  if (isMain) return null;
  return (
    <div
      role="note"
      aria-label="Test environment"
      className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900"
    >
      {TEST_TRANSACTION_NOTICE} · environment: {label}
    </div>
  );
}

/** Page wrapper: operator/participant chrome + env banner + title/subtitle. */
export function ParticipantPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppLayout>
      <EnvTestBanner />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </AppLayout>
  );
}

/**
 * Principal / compensation / total-entitlement — rendered as THREE distinct rows so a participant never
 * reads compensation as a deduction from the principal, nor entitlement as a wallet balance.
 */
export function MoneyBreakdown({
  principal,
  compensation,
  total,
  currency,
  compact,
}: {
  principal: string;
  compensation: string;
  total: string;
  currency: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-ink-100", compact ? "text-sm" : "")}>
      <Row label="Principal advanced" value={formatMoney(principal, currency)} sub="Cash you physically pay the customer" />
      <Row
        label="Participant compensation"
        value={formatMoney(compensation, currency)}
        sub="Separate Kiwoo-funded earning — NOT deducted from the principal"
      />
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-sm font-semibold text-ink-900">Total entitlement</div>
        <div className="text-sm font-semibold text-ink-900">{formatMoney(total, currency)}</div>
      </div>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
      <div>
        <div className="text-sm text-ink-700">{label}</div>
        {sub && <div className="text-[11px] text-ink-400">{sub}</div>}
      </div>
      <div className="text-sm font-medium text-ink-900">{value}</div>
    </div>
  );
}

/** The liquidity-accounting definitions block (keeps the 7 concepts distinct). */
export function LiquidityConcepts() {
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold text-ink-900">Understanding your liquidity</div>
      <dl className="space-y-2">
        {LIQUIDITY_CONCEPTS.map((c) => (
          <div key={c.term}>
            <dt className="text-xs font-semibold text-ink-700">{c.term}</dt>
            <dd className="text-xs text-ink-500">{c.definition}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Offline indicator — shown when connectivity is lost; actions are blocked while it is visible. */
export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
    >
      You are offline. Financial and evidence-changing actions are disabled until a live connection is
      restored. Showing the last loaded data only.
    </div>
  );
}

/**
 * Feature-availability gate. A 503 is a DELIBERATE unavailable/upgrade state (not a crash); 401/403 is
 * an access problem. Hiding buttons is never enough — the backend also fails closed on direct calls.
 */
export function FeatureGate({
  availability,
  code,
  onRetry,
  children,
}: {
  availability: FeatureAvailability;
  code?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (availability === "available") return <>{children}</>;
  const copy: Record<Exclude<FeatureAvailability, "available">, { title: string; body: string }> = {
    disabled: {
      title: "Marketplace tools are temporarily unavailable",
      body: "This feature is being prepared (upgrade in progress). Please check back shortly — no action is possible yet.",
    },
    unauthorized: {
      title: "You don't have access to this obligation",
      body: "Your session isn't authorised for this resource. It may belong to another participant, or your access has changed.",
    },
    error: {
      title: "Something went wrong",
      body: "We couldn't load this right now. Please retry, or contact Kiwoo support if it persists.",
    },
  };
  const c = copy[availability];
  return (
    <Card className="p-6 text-center">
      <div className="text-base font-semibold text-ink-900">{c.title}</div>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{c.body}</p>
      {code && <p className="mt-1 text-[11px] text-ink-400">Reference: {code}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Card>
  );
}
