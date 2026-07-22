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
  FilterSelect,
} from "@/components/ops/FilterBar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { intelligenceService } from "@/services/intelligenceService";
import type { Notification } from "@/types/intelligence";

/**
 * Cross-user Notification stream.
 *
 * Sprint 13 Task 124 already exposes `/admin/intelligence/notifications`
 * with cursor pagination — this page is a thin filter+list on top.
 */
export default function NotificationExplorer() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [userId, setUserId] = useState("");
  const [product, setProduct] = useState("");
  const [status, setStatus] = useState("");
  const [eventId, setEventId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await intelligenceService.listNotifications({
          user_id: userId || undefined,
          product: product || undefined,
          status: status || undefined,
          event_id: eventId || undefined,
          from: from || undefined,
          to: to || undefined,
          cursor: opts.keepCursor && cursor ? cursor : undefined,
          limit: 50,
        });
        setRows(data.notifications);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [userId, product, status, eventId, from, to, cursor],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, product, status, eventId, from, to]);

  return (
    <AppLayout>
      <RefreshBar
        title="Notification Explorer"
        subtitle={`${total.toLocaleString()} notifications`}
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
            placeholder="42"
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
        <FilterField label="Status">
          <FilterSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Any</option>
            <option value="unread">unread</option>
            <option value="read">read</option>
            <option value="archived">archived</option>
          </FilterSelect>
        </FilterField>
        <FilterField label="Event ID">
          <FilterInput
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
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
              header: "When",
              width: "12rem",
              render: (r) => (
                <span className="text-xs text-ink-500">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: "user",
              header: "User",
              render: (r) =>
                r.user_id == null ? (
                  <span className="text-xs text-ink-400">system</span>
                ) : (
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
                <Link
                  to={`/ops/notifications/${encodeURIComponent(r.id)}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {r.title}
                </Link>
              ),
            },
            {
              key: "product",
              header: "Product",
              render: (r) => <Chip tone="info">{r.product ?? "—"}</Chip>,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Chip tone={r.status === "unread" ? "warning" : "muted"}>
                  {r.status}
                </Chip>
              ),
            },
            {
              key: "event",
              header: "Event",
              render: (r) =>
                r.event_id ? (
                  <Link
                    to={`/ops/events/${encodeURIComponent(r.event_id)}`}
                    className="font-mono text-[11px] text-brand-700 hover:underline"
                  >
                    {r.event_id.slice(0, 8)}…
                  </Link>
                ) : (
                  <span className="text-ink-400">—</span>
                ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="No notifications match those filters."
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
