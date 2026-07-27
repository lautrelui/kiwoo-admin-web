import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  FeatureGate,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatMoney, stateGroup, TEST_TRANSACTION_NOTICE } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService as svc } from "@/services/marketplaceParticipantService";

// M4A-2 · disputes view. Lists the participant's obligations currently under review / disputed. A
// dispute is OPENED from an obligation's detail workspace (reason required, explicit confirmation).

export default function ParticipantDisputes() {
  const online = useOnline();
  const res = useAsyncResource(() => svc.listObligations("all"), []);
  useLifecycleRefresh(res.reload);
  const rows = (res.data ?? []).filter((o) => stateGroup(o.state) === "review");

  return (
    <ParticipantPage title="Disputes" subtitle="Obligations under Kiwoo review">
      <OfflineBanner online={online} />
      <TestNotice notice={rows.length ? TEST_TRANSACTION_NOTICE : null} className="mb-4" />

      <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        When a dispute is open the case enters manual review, settlement and compensation may be frozen,
        and you cannot choose the final financial outcome — Kiwoo operator adjudication is final per policy.
      </Card>

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        {res.loading && rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">No obligations under review.</Card>
        ) : (
          <div className="space-y-3">
            {rows.map((o) => (
              <Card key={o.fulfilment_ref} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-500">{o.fulfilment_ref}</span>
                      <StateBadge state={o.state} />
                    </div>
                    <div className="mt-1 text-sm text-ink-700">
                      Principal {formatMoney(o.payout_amount, o.currency_hint)} · compensation {formatMoney(o.participant_compensation, o.currency_hint)}
                    </div>
                  </div>
                  <Link to={`/participant/marketplace/obligations/${encodeURIComponent(o.fulfilment_ref)}`}>
                    <Button size="sm" variant="secondary">Open</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}
