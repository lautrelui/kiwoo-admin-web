import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput } from "@/components/ui/FormInput";
import {
  FeatureGate,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatMoney } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import {
  FOUR_EYES_LABEL,
  PRESET_META,
  QueuePreset,
  ageText,
  reviewReasonLabel,
} from "@/lib/marketplaceOperator";
import { marketplaceOperatorService as svc } from "@/services/marketplaceOperatorService";
import type { OperatorReviewQueueItem } from "@/types/marketplaceOperator";
import { cn } from "@/lib/utils";

// M4A-3 · operator review queue. Bounded, server-filtered, paginated. Each preset (nav sub-section)
// maps to server-backed filters; "awaiting 2nd approval" additionally filters the page by four-eyes
// status. Rows open the case detail. Nothing here moves money.

const PAGE = 50;

export default function ReviewQueue({ preset = "all" }: { preset?: QueuePreset }) {
  const online = useOnline();
  const meta = PRESET_META[preset];
  const [offset, setOffset] = useState(0);
  const [reason, setReason] = useState("");
  const [participant, setParticipant] = useState("");

  const res = useAsyncResource(
    () =>
      svc.reviews({
        ...meta.filters,
        reason: reason || meta.filters.reason,
        participant: participant ? Number(participant) : undefined,
        limit: PAGE,
        offset,
      }),
    [preset, offset, reason, participant]
  );
  useLifecycleRefresh(res.reload);

  const items = useMemo(() => {
    const rows = res.data?.items ?? [];
    return meta.clientFourEyes ? rows.filter((r) => r.four_eyes_status === meta.clientFourEyes) : rows;
  }, [res.data, meta.clientFourEyes]);
  const total = res.data?.total ?? 0;

  return (
    <ParticipantPage
      title={meta.title}
      subtitle={meta.subtitle}
      actions={<Button variant="secondary" size="sm" onClick={res.reload} disabled={res.loading}>Refresh</Button>}
    >
      <OfflineBanner online={online} />
      <TestNotice notice={items.length ? "TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED" : null} className="mb-4" />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48"><FormInput label="Reason contains" name="reason" value={reason} onChange={(e) => { setOffset(0); setReason(e.target.value); }} placeholder="e.g. DISPUTE" /></div>
        <div className="w-40"><FormInput label="Participant id" name="participant" value={participant} onChange={(e) => { setOffset(0); setParticipant(e.target.value); }} inputMode="numeric" /></div>
      </div>

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <DataTable
          columns={[
            { key: "ref", header: "Case", render: (r: OperatorReviewQueueItem) => <span className="font-mono text-xs">{r.fulfilment_ref}</span> },
            { key: "reason", header: "Reason", render: (r: OperatorReviewQueueItem) => reviewReasonLabel(r.review_reason) },
            { key: "state", header: "State", render: (r: OperatorReviewQueueItem) => <StateBadge state={r.state} /> },
            { key: "amount", header: "Cash", render: (r: OperatorReviewQueueItem) => formatMoney(r.cash_amount, r.currency) },
            { key: "participant", header: "Participant", render: (r: OperatorReviewQueueItem) => r.participant_display },
            { key: "area", header: "Area", render: (r: OperatorReviewQueueItem) => r.service_area ?? "—" },
            { key: "origin", header: "Origin", render: (r: OperatorReviewQueueItem) => r.dispute_origin ?? "—" },
            { key: "age", header: "Age", render: (r: OperatorReviewQueueItem) => ageText(r.case_age_seconds) },
            { key: "sla", header: "SLA", render: (r: OperatorReviewQueueItem) => <SlaPill s={r.sla_status} /> },
            { key: "4eyes", header: "Four-eyes", render: (r: OperatorReviewQueueItem) => <span className="text-xs">{FOUR_EYES_LABEL[r.four_eyes_status]}</span> },
            { key: "open", header: "", render: (r: OperatorReviewQueueItem) => (
              <Link to={`/operator/marketplace/case/${encodeURIComponent(r.fulfilment_ref)}`}><Button size="sm" variant="secondary">Open</Button></Link>
            ) },
          ]}
          rows={items}
          loading={res.loading}
          emptyMessage="No cases in this view."
          rowKey={(r) => r.fulfilment_ref}
        />
        <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
          <span>{total} case(s){meta.clientFourEyes ? ` · ${items.length} shown on this page` : ""}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Prev</Button>
            <Button size="sm" variant="ghost" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
          </div>
        </div>
      </FeatureGate>
    </ParticipantPage>
  );
}

function SlaPill({ s }: { s: OperatorReviewQueueItem["sla_status"] }) {
  const cls: Record<string, string> = {
    BREACHED: "bg-red-50 text-red-700 border-red-200",
    AT_RISK: "bg-amber-50 text-amber-700 border-amber-200",
    ON_TIME: "bg-emerald-50 text-emerald-700 border-emerald-200",
    NONE: "bg-ink-100 text-ink-600 border-ink-200",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cls[s])}>{s}</span>;
}
