import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  FeatureGate,
  LiquidityConcepts,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatMoney } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService } from "@/services/marketplaceParticipantService";

// M4A-2 · participant operational overview. Every money/count value is SERVER-aggregated (the client
// never sums rows). Declared liquidity is prominently distinguished from the Kiwoo wallet balance.

export default function ParticipantOverview() {
  const online = useOnline();
  const res = useAsyncResource(() => marketplaceParticipantService.overview(), []);
  useLifecycleRefresh(res.reload);
  const o = res.data;
  const cur = o?.currency ?? "HTG";

  return (
    <ParticipantPage
      title="Marketplace overview"
      subtitle="Your physical-liquidity payout activity"
      actions={
        <Button variant="secondary" size="sm" onClick={res.reload} disabled={res.loading}>
          Refresh
        </Button>
      }
    >
      <OfflineBanner online={online} />
      <TestNotice notice={o?.test_notice} className="mb-4" />

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        {res.loading && !o ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : (
          <>
            <Card className="mb-4 border-brand-200 bg-brand-50 p-4">
              <div className="text-sm font-semibold text-brand-800">
                Declared liquidity is the physical cash capacity you make available for customer payouts.
                It is <span className="underline">not</span> your Kiwoo wallet balance.
              </div>
            </Card>

            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Operational status</span>
              <StateBadge state={o?.operational_status === "ACTIVE" ? "SETTLED" : "PENDING"} />
              <span className="text-sm font-medium text-ink-700">{o?.operational_status ?? "—"}</span>
            </div>

            {/* Liquidity — kept distinct, never merged into one balance */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Declared liquidity" value={formatMoney(o?.declared_capacity, cur)} />
              <StatCard label="Available capacity" value={formatMoney(o?.available_liquidity, cur)} />
              <StatCard label="Locked liquidity" value={formatMoney(o?.locked_capacity, cur)} />
              <StatCard label="Fulfilled liquidity" value={formatMoney(o?.fulfilled_capacity, cur)} />
            </div>

            {/* Position + obligation counts */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Active positions" value={o?.active_offers ?? 0} />
              <StatCard label="Pending obligations" value={o?.pending_obligations ?? 0} />
              <StatCard label="Ready for collection" value={o?.ready_for_collection ?? 0} />
              <StatCard label="Awaiting customer" value={o?.awaiting_customer_confirmation ?? 0} />
            </div>

            {/* Entitlement — principal vs compensation stay separate */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Open disputes" value={o?.open_disputes ?? 0} />
              <StatCard label="Principal pending settlement" value={formatMoney(o?.principal_pending_settlement, cur)} />
              <StatCard label="Compensation pending" value={formatMoney(o?.compensation_pending, cur)} />
              <StatCard label="Settled entitlement today" value={formatMoney(o?.settled_entitlement_today, cur)} />
            </div>

            <LiquidityConcepts />
          </>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}
