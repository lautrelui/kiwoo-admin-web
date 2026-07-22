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
import type { SearchDocument } from "@/types/intelligence";

/**
 * Search & Knowledge Explorer — Sprint 13 Task 126 admin surface.
 *
 * Uses the same fulltext branch the user endpoint uses, but scoped
 * to whichever user id the operator supplies (or unscoped for
 * platform-wide investigation). Empty `q` degrades to recency order
 * so the page also works as "recent SearchDocuments" browser.
 */
export default function SearchExplorer() {
  const [rows, setRows] = useState<SearchDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [userId, setUserId] = useState("");
  const [product, setProduct] = useState("");
  const [entityType, setEntityType] = useState("");
  const [correlation, setCorrelation] = useState("");

  const load = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await intelligenceService.search({
          q: q || undefined,
          user_id: userId || undefined,
          product: product || undefined,
          entity_type: entityType || undefined,
          correlation_id: correlation || undefined,
          cursor: opts.keepCursor && cursor ? cursor : undefined,
          limit: 50,
        });
        setRows(data.documents);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [q, userId, product, entityType, correlation, cursor],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, userId, product, entityType, correlation]);

  return (
    <AppLayout>
      <RefreshBar
        title="Search & Knowledge Explorer"
        subtitle={
          q
            ? `${total.toLocaleString()} matches for “${q}”`
            : `${total.toLocaleString()} indexed documents`
        }
        onRefresh={() => {
          setCursor(null);
          void load();
        }}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <FilterBar className="mt-4">
        <FilterField label="Query" className="min-w-[240px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCursor(null);
              setQ(qInput.trim());
            }}
          >
            <FilterInput
              placeholder={'e.g. "500 HTGe" or -receipt'}
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </form>
        </FilterField>
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
        <FilterField label="Entity type">
          <FilterInput
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
        </FilterField>
        <FilterField label="Correlation">
          <FilterInput
            value={correlation}
            onChange={(e) => setCorrelation(e.target.value)}
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
              header: "Entity",
              render: (r) => <Chip tone="brand">{r.entity_type}</Chip>,
            },
            {
              key: "product",
              header: "Product",
              render: (r) => <Chip tone="info">{r.product ?? "—"}</Chip>,
            },
            {
              key: "owner",
              header: "Owner",
              render: (r) =>
                r.owner_user_id ? (
                  <Link
                    to={`/ops/users/${r.owner_user_id}`}
                    className="text-brand-700 hover:underline"
                  >
                    #{r.owner_user_id}
                  </Link>
                ) : (
                  <Chip tone="muted">public</Chip>
                ),
            },
            {
              key: "rank",
              header: "Rank",
              render: (r) =>
                r.rank !== null && r.rank !== undefined ? (
                  <span className="font-mono text-xs">
                    {r.rank.toFixed(3)}
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
          emptyMessage={
            q
              ? "No documents match that query."
              : "No documents indexed yet. Publish an event that the composer knows about."
          }
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
