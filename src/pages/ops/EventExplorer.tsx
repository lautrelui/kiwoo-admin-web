import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import {
  FilterBar,
  FilterField,
  FilterInput,
} from "@/components/ops/FilterBar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { intelligenceService } from "@/services/intelligenceService";
import type { PlatformEvent } from "@/types/intelligence";

/**
 * PlatformEvent ledger explorer — the append-only source of truth for
 * everything the platform reacts to. Filters map 1:1 to the Task 123
 * admin controller so no server-side changes are required.
 */
export default function EventExplorer() {
  const [rows, setRows] = useState<PlatformEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [product, setProduct] = useState("");
  const [event, setEvent] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [actor, setActor] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await intelligenceService.listEvents({
          product: product || undefined,
          event: event || undefined,
          correlation_id: correlationId || undefined,
          actor_ref: actor || undefined,
          subject_ref: subject || undefined,
          from: from || undefined,
          to: to || undefined,
          cursor: opts.keepCursor && cursor ? cursor : undefined,
          limit: 50,
        });
        setRows(Array.isArray(data.events) ? data.events : []);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [product, event, correlationId, actor, subject, from, to, cursor],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, event, correlationId, actor, subject, from, to]);

  return (
    <AppLayout>
      <RefreshBar
        title="Event Explorer"
        subtitle={`${total.toLocaleString()} PlatformEvents in ledger`}
        onRefresh={() => {
          setCursor(null);
          void load();
        }}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <FilterBar className="mt-4">
        <FilterField label="Product">
          <FilterInput
            placeholder="wallet, commerce…"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </FilterField>
        <FilterField label="Event type">
          <FilterInput
            placeholder="wallet.received"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          />
        </FilterField>
        <FilterField label="Actor ref">
          <FilterInput
            placeholder="user:42"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </FilterField>
        <FilterField label="Subject ref">
          <FilterInput
            placeholder="tx:xyz"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </FilterField>
        <FilterField label="Correlation">
          <FilterInput
            placeholder="uuid"
            value={correlationId}
            onChange={(e) => setCorrelationId(e.target.value)}
          />
        </FilterField>
        <FilterField label="From">
          <FilterInput
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FilterField>
        <FilterField label="To">
          <FilterInput
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FilterField>
      </FilterBar>

      <ErrorNote error={error} className="mt-4" />

      <div className="mt-4">
        <DataTable
          columns={[
            {
              key: "when",
              header: "Occurred at",
              width: "12rem",
              render: (r) => (
                <span className="text-xs text-ink-500">
                  {new Date(r.occurred_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: "type",
              header: "Event type",
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
              key: "product",
              header: "Product",
              render: (r) => <Chip tone="info">{r.source_product ?? "—"}</Chip>,
            },
            {
              key: "actor",
              header: "Actor",
              render: (r) => (
                <span className="text-ink-700">{r.actor_ref ?? "—"}</span>
              ),
            },
            {
              key: "subject",
              header: "Subject",
              render: (r) => (
                <span className="text-ink-700">{r.subject_ref ?? "—"}</span>
              ),
            },
            {
              key: "correlation",
              header: "Correlation",
              render: (r) =>
                r.correlation_id ? (
                  <span className="font-mono text-[11px] text-ink-500">
                    {r.correlation_id.slice(0, 8)}…
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="No events match those filters."
          rowKey={(r) => r.event_id}
        />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
        <span>{rows.length} shown</span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!cursor || loading}
            onClick={() => {
              setCursor(null);
              void load();
            }}
          >
            ← Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!nextCursor || loading}
            onClick={() => {
              setCursor(nextCursor);
              void load({ keepCursor: true });
            }}
          >
            Next page →
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
