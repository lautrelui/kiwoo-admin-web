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
import type { Activity } from "@/types/intelligence";

export default function ActivityExplorer() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [userId, setUserId] = useState("");
  const [product, setProduct] = useState("");
  const [activityType, setActivityType] = useState("");
  const [eventId, setEventId] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await intelligenceService.listActivity({
          user_id: userId || undefined,
          product: product || undefined,
          activity_type: activityType || undefined,
          event_id: eventId || undefined,
          correlation_id: correlationId || undefined,
          from: from || undefined,
          to: to || undefined,
          cursor: opts.keepCursor && cursor ? cursor : undefined,
          limit: 50,
        });
        setRows(Array.isArray(data.activity) ? data.activity : []);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [userId, product, activityType, eventId, correlationId, from, to, cursor],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, product, activityType, eventId, correlationId, from, to]);

  return (
    <AppLayout>
      <RefreshBar
        title="Activity Explorer"
        subtitle={`${total.toLocaleString()} activity rows`}
        onRefresh={() => {
          setCursor(null);
          void load();
        }}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <FilterBar className="mt-4">
        <FilterField label="User ID">
          <FilterInput
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </FilterField>
        <FilterField label="Product">
          <FilterInput
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </FilterField>
        <FilterField label="Activity type">
          <FilterInput
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          />
        </FilterField>
        <FilterField label="Event ID">
          <FilterInput
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
        </FilterField>
        <FilterField label="Correlation">
          <FilterInput
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
              header: "Occurred",
              width: "12rem",
              render: (r) => (
                <span className="text-xs text-ink-500">
                  {new Date(r.occurred_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: "user",
              header: "User",
              render: (r) => (
                <Link
                  to={`/ops/users/${r.user_id}`}
                  className="text-brand-700 hover:underline"
                >
                  #{r.user_id}
                </Link>
              ),
            },
            {
              key: "title",
              header: "Title",
              render: (r) => (
                <div>
                  <div className="font-medium text-ink-900">{r.title}</div>
                  {r.subtitle && (
                    <div className="text-xs text-ink-500">{r.subtitle}</div>
                  )}
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (r) => <Chip tone="brand">{r.activity_type}</Chip>,
            },
            {
              key: "product",
              header: "Product",
              render: (r) => <Chip tone="info">{r.product ?? "—"}</Chip>,
            },
            {
              key: "amount",
              header: "Amount",
              render: (r) =>
                r.amount ? (
                  <span className="font-mono text-xs">
                    {r.amount} {r.currency ?? ""}
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                ),
            },
            {
              key: "event",
              header: "Event",
              render: (r) => (
                <Link
                  to={`/ops/events/${encodeURIComponent(r.event_id)}`}
                  className="font-mono text-[11px] text-brand-700 hover:underline"
                >
                  {r.event_id.slice(0, 8)}…
                </Link>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="No activity matches those filters."
          rowKey={(r) => r.id}
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
