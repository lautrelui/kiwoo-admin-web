import { useMemo, useState } from "react";
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
import { formatMoney, stateGroup, StateGroup, TEST_TRANSACTION_NOTICE, timeRemaining } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useNowTick, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService as svc } from "@/services/marketplaceParticipantService";
import type { ObligationView } from "@/types/marketplace";

// M4A-2 · obligation queue. Filter by lifecycle group; each obligation opens the detail workspace where
// the accept → validate → handover → wait → dispute lifecycle happens. Opaque customer ref only.

type Filter = "all" | "pending" | "accepted" | "ready" | "awaiting";

const FILTERS: Array<{ key: Filter; label: string; groups: StateGroup[] }> = [
  { key: "all", label: "All", groups: [] },
  { key: "pending", label: "Pending", groups: ["pending"] },
  { key: "accepted", label: "Accepted", groups: ["accepted"] },
  { key: "ready", label: "Ready for collection", groups: ["ready"] },
  { key: "awaiting", label: "Awaiting customer", groups: ["awaiting"] },
];

export default function ParticipantObligations() {
  const online = useOnline();
  const now = useNowTick();
  const res = useAsyncResource(() => svc.listObligations(), []);
  useLifecycleRefresh(res.reload);
  const [filter, setFilter] = useState<Filter>("all");
  const rows = res.data ?? [];

  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.key === filter)!;
    if (def.groups.length === 0) return rows;
    return rows.filter((o) => def.groups.includes(stateGroup(o.state)));
  }, [rows, filter]);

  return (
    <ParticipantPage title="Obligations" subtitle="Assigned payout obligations awaiting your action">
      <OfflineBanner online={online} />
      <TestNotice notice={rows.length ? TEST_TRANSACTION_NOTICE : null} className="mb-4" />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "primary" : "secondary"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={res.reload} disabled={res.loading}>Refresh</Button>
      </div>

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        {res.loading && rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">No obligations in this view.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <ObligationRow key={o.fulfilment_ref} o={o} nowMs={now} />
            ))}
          </div>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}

function ObligationRow({ o, nowMs }: { o: ObligationView; nowMs: number }) {
  const acc = timeRemaining(o.acceptance_deadline, nowMs);
  const total = String(Number(o.payout_amount) + Number(o.participant_compensation));
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink-500">{o.fulfilment_ref}</span>
            <StateBadge state={o.state} />
          </div>
          <div className="mt-1 text-sm text-ink-700">
            Hand over <span className="font-semibold">{formatMoney(o.payout_amount, o.currency_hint)}</span> · compensation{" "}
            <span className="font-semibold">{formatMoney(o.participant_compensation, o.currency_hint)}</span> · entitlement{" "}
            <span className="font-semibold">{formatMoney(total, o.currency_hint)}</span>
          </div>
          {o.acceptance_deadline && (
            <div className={`mt-0.5 text-xs ${acc.expired ? "text-red-600" : "text-ink-400"}`}>Acceptance {acc.text}</div>
          )}
        </div>
        <Link to={`/participant/marketplace/obligations/${encodeURIComponent(o.fulfilment_ref)}`}>
          <Button size="sm">Open</Button>
        </Link>
      </div>
    </Card>
  );
}
