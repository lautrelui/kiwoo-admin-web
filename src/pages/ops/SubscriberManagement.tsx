import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import {
  FilterBar,
  FilterField,
  FilterInput,
  FilterSelect,
} from "@/components/ops/FilterBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { intelligenceService } from "@/services/intelligenceService";
import type {
  Subscriber,
  SubscriberCheckpoint,
} from "@/types/intelligence";

/**
 * Subscriber Management — the pane where operators watch subscriber
 * health and, when a projection drifts, trigger a filtered replay.
 *
 * All three admin surfaces this page uses already exist:
 *   GET  /admin/intelligence/subscribers    → registry snapshot
 *   GET  /admin/intelligence/checkpoints    → per-subscriber counters
 *   POST /admin/intelligence/replay         → targeted rewind
 */
interface ReplayFormState {
  subscriber: string;
  product: string;
  event_type: string;
  correlation_id: string;
  from: string;
  to: string;
}

export default function SubscriberManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [checkpoints, setCheckpoints] = useState<SubscriberCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [form, setForm] = useState<ReplayFormState>({
    subscriber: "",
    product: "",
    event_type: "",
    correlation_id: "",
    from: "",
    to: "",
  });
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<null | {
    subscriber: string;
    events_processed: number;
    events_errored: number;
  }>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replayError, setReplayError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, cks] = await Promise.all([
        intelligenceService.listSubscribers(),
        intelligenceService.listCheckpoints(),
      ]);
      setSubscribers(subs.subscribers);
      setCheckpoints(cks.checkpoints);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byName = new Map(checkpoints.map((c) => [c.subscriber_name, c] as const));

  async function runReplay() {
    setReplaying(true);
    setReplayResult(null);
    setReplayError(null);
    try {
      const r = await intelligenceService.replay({
        subscriber: form.subscriber,
        product: form.product || undefined,
        event_type: form.event_type || undefined,
        correlation_id: form.correlation_id || undefined,
        from: form.from || undefined,
        to: form.to || undefined,
      });
      setReplayResult({
        subscriber: r.subscriber,
        events_processed: r.events_processed,
        events_errored: r.events_errored,
      });
      await load();
    } catch (e) {
      setReplayError(e);
    } finally {
      setReplaying(false);
      setConfirmOpen(false);
    }
  }

  return (
    <AppLayout>
      <RefreshBar
        title="Subscriber Management"
        subtitle={`${subscribers.length} registered subscribers`}
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      <div className="mt-4">
        <DataTable
          columns={[
            {
              key: "name",
              header: "Subscriber",
              render: (r) => (
                <span className="font-medium text-ink-900">{r.name}</span>
              ),
            },
            {
              key: "interest",
              header: "Interest",
              render: (r) =>
                Array.isArray(r.interest) ? (
                  <div className="flex flex-wrap gap-1">
                    {r.interest.map((i) => (
                      <Chip key={i} tone="info">
                        {i}
                      </Chip>
                    ))}
                  </div>
                ) : r.interest === "*" ? (
                  <Chip tone="brand">wildcard</Chip>
                ) : (
                  <Chip tone="info">{r.interest}</Chip>
                ),
            },
            {
              key: "processed",
              header: "Processed",
              render: (r) => (
                <span className="font-mono text-xs">
                  {byName.get(r.name)?.events_processed ?? 0}
                </span>
              ),
            },
            {
              key: "errored",
              header: "Errored",
              render: (r) => {
                const n = byName.get(r.name)?.events_errored ?? 0;
                return (
                  <Chip tone={n > 0 ? "danger" : "muted"}>{n}</Chip>
                );
              },
            },
            {
              key: "last",
              header: "Last processed",
              render: (r) => {
                const t = byName.get(r.name)?.last_processed_at;
                return (
                  <span className="text-xs text-ink-500">
                    {t ? new Date(t).toLocaleString() : "—"}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setForm((f) => ({ ...f, subscriber: r.name }));
                    setReplayResult(null);
                    setReplayError(null);
                  }}
                >
                  Replay…
                </Button>
              ),
            },
          ]}
          rows={subscribers}
          loading={loading}
          emptyMessage="No subscribers registered."
          rowKey={(r) => r.name}
        />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-ink-900">Targeted Replay</h2>
        <p className="mt-1 text-xs text-ink-500">
          Re-invokes a subscriber over the filtered slice of the ledger.
          Replays are idempotent — subscribers dedupe by event id.
        </p>

        <FilterBar className="mt-4">
          <FilterField label="Subscriber">
            <FilterSelect
              value={form.subscriber}
              onChange={(e) =>
                setForm({ ...form, subscriber: e.target.value })
              }
            >
              <option value="">Pick one…</option>
              {subscribers.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Product">
            <FilterInput
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
          </FilterField>
          <FilterField label="Event type">
            <FilterInput
              value={form.event_type}
              onChange={(e) =>
                setForm({ ...form, event_type: e.target.value })
              }
            />
          </FilterField>
          <FilterField label="Correlation">
            <FilterInput
              value={form.correlation_id}
              onChange={(e) =>
                setForm({ ...form, correlation_id: e.target.value })
              }
            />
          </FilterField>
          <FilterField label="From">
            <FilterInput
              type="datetime-local"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
          </FilterField>
          <FilterField label="To">
            <FilterInput
              type="datetime-local"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </FilterField>
        </FilterBar>

        <div className="mt-4 flex items-center gap-3">
          <Button
            disabled={!form.subscriber || replaying}
            onClick={() => setConfirmOpen(true)}
          >
            {replaying ? "Replaying…" : "Run Replay"}
          </Button>
          {replayResult && (
            <span className="text-sm text-ink-700">
              ✓ <b>{replayResult.subscriber}</b> processed{" "}
              {replayResult.events_processed}, errored{" "}
              {replayResult.events_errored}
            </span>
          )}
        </div>
        <ErrorNote error={replayError} className="mt-3" />
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={runReplay}
        title="Trigger targeted replay?"
        message={`This will re-invoke ${form.subscriber} over the filtered events. Subscribers dedupe by event id so this is idempotent, but it can produce load on the database.`}
        confirmLabel="Replay"
      />
    </AppLayout>
  );
}
