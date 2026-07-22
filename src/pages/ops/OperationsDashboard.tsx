import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import { Chip } from "@/components/ops/Chip";
import { intelligenceService } from "@/services/intelligenceService";
import { userService } from "@/services/userService";
import type {
  PlatformEvent,
  Subscriber,
  SubscriberCheckpoint,
} from "@/types/intelligence";

/**
 * The Operations Dashboard is the operator's first pane of glass.
 *
 * Sprint 13 Task 126.5 — pulls in parallel:
 *   - total counts from every Intelligence surface (Events,
 *     Notifications, Activity, Search)
 *   - a health snapshot of registered subscribers + their checkpoints
 *   - the most recent platform events for a live "pulse"
 *
 * Every fetch tolerates a partial failure: if Notifications is down,
 * the rest of the tiles still render and the failed tile shows a
 * ⚠ instead of a number.
 */

interface Counts {
  events?: number;
  users?: number;
  notifications?: number;
  activity?: number;
  search?: number;
  knowledge?: number;
  subscribers?: number;
}

interface FetchErrors {
  counts?: unknown;
  subscribers?: unknown;
  checkpoints?: unknown;
  recent?: unknown;
}

export default function OperationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({});
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [checkpoints, setCheckpoints] = useState<SubscriberCheckpoint[]>([]);
  const [recent, setRecent] = useState<PlatformEvent[]>([]);
  const [errors, setErrors] = useState<FetchErrors>({});
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const nextCounts: Counts = {};
    const nextErrs: FetchErrors = {};

    // Fire everything in parallel. Each promise catches independently so
    // one failure doesn't hide the rest of the dashboard.
    const [
      evRes,
      usRes,
      noRes,
      acRes,
      seRes,
      kwRes,
      subsRes,
      cksRes,
      recentRes,
    ] = await Promise.allSettled([
      intelligenceService.listEvents({ limit: 1 }),
      userService.list({ limit: 1 }),
      intelligenceService.listNotifications({ limit: 1 }),
      intelligenceService.listActivity({ limit: 1 }),
      intelligenceService.search({ limit: 1 }),
      intelligenceService.listKnowledge({ limit: 1 }),
      intelligenceService.listSubscribers(),
      intelligenceService.listCheckpoints(),
      intelligenceService.listEvents({ limit: 10 }),
    ]);

    if (evRes.status === "fulfilled") nextCounts.events = evRes.value?.total ?? 0;
    else nextErrs.counts = evRes.reason;
    if (usRes.status === "fulfilled") nextCounts.users = usRes.value?.total ?? 0;
    if (noRes.status === "fulfilled")
      nextCounts.notifications = noRes.value?.total ?? 0;
    if (acRes.status === "fulfilled") nextCounts.activity = acRes.value?.total ?? 0;
    if (seRes.status === "fulfilled") nextCounts.search = seRes.value?.total ?? 0;
    if (kwRes.status === "fulfilled") nextCounts.knowledge = kwRes.value?.total ?? 0;

    if (subsRes.status === "fulfilled") {
      const subs = Array.isArray(subsRes.value?.subscribers)
        ? subsRes.value.subscribers
        : [];
      setSubscribers(subs);
      nextCounts.subscribers = subs.length;
    } else {
      nextErrs.subscribers = subsRes.reason;
    }
    if (cksRes.status === "fulfilled")
      setCheckpoints(
        Array.isArray(cksRes.value?.checkpoints)
          ? cksRes.value.checkpoints
          : [],
      );
    else nextErrs.checkpoints = cksRes.reason;
    if (recentRes.status === "fulfilled")
      setRecent(
        Array.isArray(recentRes.value?.events) ? recentRes.value.events : [],
      );
    else nextErrs.recent = recentRes.reason;

    setCounts(nextCounts);
    setErrors(nextErrs);
    setLoading(false);
    setRefreshedAt(new Date());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const checkpointByName = new Map(
    checkpoints.map((c) => [c.subscriber_name, c] as const),
  );

  return (
    <AppLayout>
      <RefreshBar
        title="Operations Dashboard"
        subtitle="Health, throughput and pulse across the Kiwoo Intelligence Platform"
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={errors.counts} className="mt-4" />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        <StatCard
          label="Platform Events"
          value={fmt(counts.events)}
          icon={<span>◎</span>}
        />
        <StatCard label="Platform Users" value={fmt(counts.users)} />
        <StatCard label="Notifications" value={fmt(counts.notifications)} />
        <StatCard label="Activity" value={fmt(counts.activity)} />
        <StatCard label="Search Docs" value={fmt(counts.search)} />
        <StatCard label="Knowledge Facts" value={fmt(counts.knowledge)} />
        <StatCard label="Subscribers" value={fmt(counts.subscribers)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              Recent Events
            </h2>
            <Link
              to="/ops/events"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Explore →
            </Link>
          </div>
          <ErrorNote error={errors.recent} className="mb-3" />
          <DataTable
            columns={[
              {
                key: "occurred_at",
                header: "When",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {r.occurred_at
                      ? new Date(r.occurred_at).toLocaleString()
                      : "—"}
                  </span>
                ),
              },
              {
                key: "event_type",
                header: "Event",
                render: (r) => (
                  <Link
                    to={`/ops/events/${encodeURIComponent(r.event_id)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.event_type}
                  </Link>
                ),
              },
              {
                key: "source_product",
                header: "Product",
                render: (r) => (
                  <Chip tone="info">
                    {r.source_product ?? "—"}
                  </Chip>
                ),
              },
              {
                key: "actor_ref",
                header: "Actor",
                render: (r) => (
                  <span className="text-ink-700">{r.actor_ref ?? "—"}</span>
                ),
              },
            ]}
            rows={recent}
            loading={loading && recent.length === 0}
            emptyMessage="No events yet — publish one via any Product."
            rowKey={(r) => r.event_id}
          />
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              Subscriber Health
            </h2>
            <Link
              to="/ops/subscribers"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Manage →
            </Link>
          </div>
          <ErrorNote error={errors.subscribers} className="mb-3" />
          {loading && subscribers.length === 0 ? (
            <div className="text-sm text-ink-400">Loading…</div>
          ) : subscribers.length === 0 ? (
            <div className="text-sm text-ink-400">No subscribers.</div>
          ) : (
            <ul className="space-y-2">
              {subscribers.map((s) => {
                const ck = checkpointByName.get(s.name);
                const errored = ck?.events_errored ?? 0;
                const processed = ck?.events_processed ?? 0;
                const tone =
                  errored > 0
                    ? "warning"
                    : processed > 0
                      ? "success"
                      : "muted";
                return (
                  <li
                    key={s.name}
                    className="rounded-lg border border-ink-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900">
                        {s.name}
                      </span>
                      <Chip tone={tone}>
                        {errored > 0
                          ? `${errored} err`
                          : processed > 0
                            ? "healthy"
                            : "idle"}
                      </Chip>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-ink-500">
                      <span>interest: {formatInterest(s.interest)}</span>
                      <span>processed: {processed}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function fmt(v: number | undefined): string {
  if (v === undefined) return "⚠";
  return new Intl.NumberFormat("en-US").format(v);
}

function formatInterest(interest: string | string[]): string {
  if (Array.isArray(interest)) return interest.join(", ");
  return interest;
}
