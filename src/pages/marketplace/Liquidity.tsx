import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import {
  FeatureGate,
  LiquidityConcepts,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatDateTime, formatMoney, positionTone } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService } from "@/services/marketplaceParticipantService";
import type { PositionView } from "@/types/marketplace";
import { cn } from "@/lib/utils";

// M4A-2 · liquidity DASHBOARD (read-only). Per-position declared/available/locked/fulfilled + operational
// constraints + informational utilization. Never exposes customer pricing or Kiwoo margin. Backend
// values are authoritative — utilization is a display-only ratio.

function utilization(o: PositionView): number {
  const declared = Number(o.declared_capacity);
  if (!Number.isFinite(declared) || declared <= 0) return 0;
  const used = Number(o.locked_capacity) + Number(o.fulfilled_capacity);
  const pct = Math.round((used / declared) * 100);
  return Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
}

export default function ParticipantLiquidity() {
  const online = useOnline();
  const res = useAsyncResource(() => marketplaceParticipantService.listPositions(), []);
  useLifecycleRefresh(res.reload);
  const positions = res.data ?? [];

  return (
    <ParticipantPage
      title="Liquidity dashboard"
      subtitle="Declared physical cash capacity — distinct from your Kiwoo wallet balance"
      actions={
        <Button variant="secondary" size="sm" onClick={res.reload} disabled={res.loading}>
          Refresh
        </Button>
      }
    >
      <OfflineBanner online={online} />
      <TestNotice notice={positions[0] ? null : null} />

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your liquidity positions</CardTitle>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={[
                    { key: "position_ref", header: "Position", render: (o: PositionView) => <span className="font-mono text-xs">{o.position_ref}</span> },
                    { key: "status", header: "Status", render: (o: PositionView) => <StatusPill o={o} /> },
                    { key: "declared", header: "Declared", render: (o: PositionView) => formatMoney(o.declared_capacity, o.currency) },
                    { key: "available", header: "Available", render: (o: PositionView) => formatMoney(o.available_capacity, o.currency) },
                    { key: "locked", header: "Locked", render: (o: PositionView) => formatMoney(o.locked_capacity, o.currency) },
                    { key: "fulfilled", header: "Fulfilled", render: (o: PositionView) => formatMoney(o.fulfilled_capacity, o.currency) },
                    { key: "bounds", header: "Min / Max", render: (o: PositionView) => `${formatMoney(o.min_amount, o.currency)} – ${formatMoney(o.max_amount, o.currency)}` },
                    { key: "util", header: "Utilization", render: (o: PositionView) => <Util pct={utilization(o)} /> },
                    { key: "area", header: "Area", render: (o: PositionView) => o.location_label ?? "—" },
                    { key: "method", header: "Payout", render: (o: PositionView) => o.payout_method ?? "—" },
                    { key: "updated", header: "Updated", render: (o: PositionView) => formatDateTime(o.updated_at) },
                  ]}
                  rows={positions}
                  loading={res.loading}
                  emptyMessage="No liquidity positions yet. Create one from Positions."
                  rowKey={(o) => o.position_ref}
                />
              </CardBody>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Liquidity change history</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-400">
                  An immutable per-position change history (created / increased / reduced / paused / resumed /
                  closed / lock acquired / released / consumed / fulfilled) requires a dedicated
                  participant-safe backend endpoint that does not exist yet. This section intentionally
                  shows nothing rather than fabricate events. Tracked as an M4A-2 API gap.
                </p>
              </CardBody>
            </Card>
          </div>

          <div>
            <LiquidityConcepts />
          </div>
        </div>
      </FeatureGate>
    </ParticipantPage>
  );
}

function StatusPill({ o }: { o: PositionView }) {
  const tone = positionTone(o.status);
  const cls: Record<string, string> = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    muted: "bg-ink-100 text-ink-600 border-ink-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    bad: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cls[tone])}>{o.status}</span>;
}

function Util({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Utilization ${pct} percent`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink-500">{pct}%</span>
    </div>
  );
}
