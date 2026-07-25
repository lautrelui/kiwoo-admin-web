import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  FeatureGate,
  OfflineBanner,
  ParticipantPage,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatDateTime, TEST_TRANSACTION_NOTICE } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import { marketplaceParticipantService as svc } from "@/services/marketplaceParticipantService";

// M4A-2 · participant activity feed. Composed CLIENT-SIDE from already-privacy-safe projections (the
// participant's own obligations + their evidence trails) — no new authoritative data, no internal ids.
// Bounded to the most recent N obligations to avoid unbounded fan-out; truncation is disclosed (never
// silent).

const MAX_OBLIGATIONS = 25;

interface FeedItem {
  ref: string;
  occurred_at: string;
  label: string;
}

const EVENT_LABEL: Record<string, string> = {
  PARTICIPANT_ACCEPTED: "Obligation accepted",
  PARTICIPANT_REJECTED: "Obligation rejected",
  COLLECTION_CREDENTIAL_VERIFIED: "Customer credential verified",
  HANDOVER_CONFIRMED: "Cash handover confirmed",
  CUSTOMER_RECEIPT_CONFIRMED: "Customer confirmed receipt",
  CUSTOMER_RECEIPT_DENIED: "Customer denied receipt",
  SETTLEMENT: "Settlement completed",
  COMPENSATION: "Compensation completed",
  DISPUTE_OPENED: "Dispute opened",
};

export default function ParticipantActivity() {
  const online = useOnline();
  const res = useAsyncResource(() => svc.listObligations("all"), []);
  useLifecycleRefresh(res.reload);
  const obligations = res.data ?? [];

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [truncated, setTruncated] = useState(0);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    let alive = true;
    async function build() {
      if (obligations.length === 0) {
        setFeed([]);
        setTruncated(0);
        return;
      }
      setBuilding(true);
      const slice = obligations.slice(0, MAX_OBLIGATIONS);
      setTruncated(Math.max(0, obligations.length - slice.length));
      const trails = await Promise.all(
        slice.map((o) => svc.evidenceTrail(o.fulfilment_ref).then((t) => ({ ref: o.fulfilment_ref, t })).catch(() => ({ ref: o.fulfilment_ref, t: [] })))
      );
      if (!alive) return;
      const items: FeedItem[] = [];
      for (const { ref, t } of trails) {
        for (const e of t) items.push({ ref, occurred_at: e.occurred_at, label: EVENT_LABEL[e.type] ?? e.type });
      }
      items.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));
      setFeed(items);
      setBuilding(false);
    }
    build();
    return () => {
      alive = false;
    };
  }, [obligations]);

  return (
    <ParticipantPage
      title="Activity"
      subtitle="Your obligation events"
      actions={<Button size="sm" variant="secondary" onClick={res.reload} disabled={res.loading}>Refresh</Button>}
    >
      <OfflineBanner online={online} />
      <TestNotice notice={obligations.length ? TEST_TRANSACTION_NOTICE : null} className="mb-4" />

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <Card>
          <CardHeader><CardTitle>Recent events</CardTitle></CardHeader>
          <CardBody>
            {res.loading || building ? (
              <p className="text-sm text-ink-400">Loading…</p>
            ) : feed.length === 0 ? (
              <p className="text-sm text-ink-400">No recorded events yet.</p>
            ) : (
              <ol className="space-y-2">
                {feed.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-40 shrink-0 text-xs text-ink-400">{formatDateTime(f.occurred_at)}</span>
                    <span className="text-ink-700">{f.label}</span>
                    <span className="font-mono text-[11px] text-ink-300">{f.ref}</span>
                  </li>
                ))}
              </ol>
            )}
            {truncated > 0 && (
              <p className="mt-3 text-xs text-ink-400">
                Showing events for the most recent {MAX_OBLIGATIONS} obligations. {truncated} older
                obligation(s) are not shown here — open them individually for their full timeline.
              </p>
            )}
          </CardBody>
        </Card>
      </FeatureGate>
    </ParticipantPage>
  );
}
