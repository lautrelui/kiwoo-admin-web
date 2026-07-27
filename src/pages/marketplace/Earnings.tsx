import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import {
  FeatureGate,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatMoney, TEST_TRANSACTION_NOTICE } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService as svc } from "@/services/marketplaceParticipantService";
import type { ObligationView, ParticipantOverview } from "@/types/marketplace";

// M4A-2 · earnings / financial view. Aggregates are SERVER-authoritative (overview); the per-obligation
// table shows principal vs compensation vs total entitlement SEPARATELY. The 108-HTGe example: customer
// debit 108 → participant principal 100 + compensation 3 = entitlement 103 (the 3 is Kiwoo-funded, not
// a deduction from the 100). Full receipts live on each obligation's detail page.

const AMPLE = "108 HTGe customer debit → you receive principal 100 + compensation 3 = entitlement 103. Compensation is Kiwoo-funded and is NOT deducted from the principal.";

export default function ParticipantEarnings() {
  const online = useOnline();
  const res = useAsyncResource<{ overview: ParticipantOverview; obligations: ObligationView[] }>(async () => {
    const [overview, obligations] = await Promise.all([svc.overview(), svc.listObligations("all")]);
    return { overview, obligations };
  }, []);
  useLifecycleRefresh(res.reload);
  const ov = res.data?.overview;
  const rows = res.data?.obligations ?? [];
  const cur = ov?.currency ?? "HTG";

  return (
    <ParticipantPage title="Earnings" subtitle="Principal, compensation and total entitlement — kept separate">
      <OfflineBanner online={online} />
      <TestNotice notice={ov?.test_notice} className="mb-4" />

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Principal pending settlement" value={formatMoney(ov?.principal_pending_settlement, cur)} />
          <StatCard label="Compensation pending" value={formatMoney(ov?.compensation_pending, cur)} />
          <StatCard label="Settled entitlement today" value={formatMoney(ov?.settled_entitlement_today, cur)} />
        </div>

        <Card className="mb-4 border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">{AMPLE}</Card>

        <Card>
          <CardHeader><CardTitle>Obligations</CardTitle></CardHeader>
          <CardBody>
            <DataTable
              columns={[
                { key: "ref", header: "Obligation", render: (o: ObligationView) => <span className="font-mono text-xs">{o.fulfilment_ref}</span> },
                { key: "state", header: "Status", render: (o: ObligationView) => <StateBadge state={o.state} /> },
                { key: "principal", header: "Principal", render: (o: ObligationView) => formatMoney(o.payout_amount, o.currency_hint) },
                { key: "comp", header: "Compensation", render: (o: ObligationView) => formatMoney(o.participant_compensation, o.currency_hint) },
                { key: "total", header: "Total entitlement", render: (o: ObligationView) => formatMoney(String(Number(o.payout_amount) + Number(o.participant_compensation)), o.currency_hint) },
                { key: "open", header: "", render: (o: ObligationView) => (
                  <Link to={`/participant/marketplace/obligations/${encodeURIComponent(o.fulfilment_ref)}`}>
                    <Button size="sm" variant="ghost">Receipt</Button>
                  </Link>
                ) },
              ]}
              rows={rows}
              loading={res.loading}
              emptyMessage="No obligations yet."
              rowKey={(o) => o.fulfilment_ref}
            />
          </CardBody>
        </Card>
      </FeatureGate>
    </ParticipantPage>
  );
}
