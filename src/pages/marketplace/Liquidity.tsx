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
import { formatDateTime, formatMoney, offerTone } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService } from "@/services/marketplaceParticipantService";
import type { OfferView } from "@/types/marketplace";
import { cn } from "@/lib/utils";

// M4A-2 · liquidity DASHBOARD (read-only). Per-offer declared/available/locked/fulfilled + operational
// constraints + informational utilization. Never exposes customer pricing or Kiwoo margin. Backend
// values are authoritative — utilization is a display-only ratio.

function utilization(o: OfferView): number {
  const declared = Number(o.declared_liquidity);
  if (!Number.isFinite(declared) || declared <= 0) return 0;
  const used = Number(o.locked_liquidity) + Number(o.fulfilled_liquidity);
  const pct = Math.round((used / declared) * 100);
  return Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
}

export default function ParticipantLiquidity() {
  const online = useOnline();
  const res = useAsyncResource(() => marketplaceParticipantService.listOffers(), []);
  useLifecycleRefresh(res.reload);
  const offers = res.data ?? [];

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
      <TestNotice notice={offers[0] ? null : null} />

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your liquidity offers</CardTitle>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={[
                    { key: "offer_ref", header: "Offer", render: (o: OfferView) => <span className="font-mono text-xs">{o.offer_ref}</span> },
                    { key: "status", header: "Status", render: (o: OfferView) => <StatusPill o={o} /> },
                    { key: "declared", header: "Declared", render: (o: OfferView) => formatMoney(o.declared_liquidity, o.currency) },
                    { key: "available", header: "Available", render: (o: OfferView) => formatMoney(o.available_liquidity, o.currency) },
                    { key: "locked", header: "Locked", render: (o: OfferView) => formatMoney(o.locked_liquidity, o.currency) },
                    { key: "fulfilled", header: "Fulfilled", render: (o: OfferView) => formatMoney(o.fulfilled_liquidity, o.currency) },
                    { key: "bounds", header: "Min / Max", render: (o: OfferView) => `${formatMoney(o.min_amount, o.currency)} – ${formatMoney(o.max_amount, o.currency)}` },
                    { key: "util", header: "Utilization", render: (o: OfferView) => <Util pct={utilization(o)} /> },
                    { key: "area", header: "Area", render: (o: OfferView) => o.location_label ?? "—" },
                    { key: "method", header: "Payout", render: (o: OfferView) => o.payout_method ?? "—" },
                    { key: "updated", header: "Updated", render: (o: OfferView) => formatDateTime(o.updated_at) },
                  ]}
                  rows={offers}
                  loading={res.loading}
                  emptyMessage="No liquidity offers yet. Create one from Offers."
                  rowKey={(o) => o.offer_ref}
                />
              </CardBody>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Liquidity change history</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-400">
                  An immutable per-offer change history (created / increased / reduced / paused / resumed /
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

function StatusPill({ o }: { o: OfferView }) {
  const tone = offerTone(o.status);
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
