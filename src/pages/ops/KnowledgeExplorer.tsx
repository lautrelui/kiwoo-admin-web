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
import type { KnowledgeFact } from "@/types/intelligence";

/**
 * Knowledge Explorer — the operator's read into the AI Knowledge
 * Layer's `KnowledgeFact` table (Sprint 13 Task 128 P1).
 *
 * Operators use this page to answer "what does the platform know
 * about user X right now?" BEFORE any assistant ships. All rows are
 * safe by construction: the extractor only materialised
 * ai_eligible_fields per Product Contract (Task 131), and sensitive
 * fields are stripped even when erroneously marked eligible.
 *
 * No LLM. No chat UI. No recommendations. Read-only visibility.
 */
export default function KnowledgeExplorer() {
  const [rows, setRows] = useState<KnowledgeFact[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const [userId, setUserId] = useState("");
  const [product, setProduct] = useState("");
  const [factType, setFactType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityRef, setEntityRef] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const data = await intelligenceService.listKnowledge({
          user_id: userId || undefined,
          product: product || undefined,
          fact_type: factType || undefined,
          entity_type: entityType || undefined,
          entity_ref: entityRef || undefined,
          from: from || undefined,
          to: to || undefined,
          cursor: opts.keepCursor && cursor ? cursor : undefined,
          limit: 50,
        });
        setRows(data.facts);
        setTotal(data.total ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setRefreshedAt(new Date());
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    [userId, product, factType, entityType, entityRef, from, to, cursor],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, product, factType, entityType, entityRef, from, to]);

  return (
    <AppLayout>
      <RefreshBar
        title="Knowledge Explorer"
        subtitle={`${total.toLocaleString()} KnowledgeFacts materialised`}
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
            placeholder="42"
            onChange={(e) => setUserId(e.target.value)}
          />
        </FilterField>
        <FilterField label="Product">
          <FilterInput
            value={product}
            placeholder="wallet"
            onChange={(e) => setProduct(e.target.value)}
          />
        </FilterField>
        <FilterField label="Fact type">
          <FilterInput
            value={factType}
            placeholder="wallet_inflow"
            onChange={(e) => setFactType(e.target.value)}
          />
        </FilterField>
        <FilterField label="Entity type">
          <FilterInput
            value={entityType}
            placeholder="commerce.receipt"
            onChange={(e) => setEntityType(e.target.value)}
          />
        </FilterField>
        <FilterField label="Entity ref">
          <FilterInput
            value={entityRef}
            onChange={(e) => setEntityRef(e.target.value)}
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
              key: "occurred_at",
              header: "Occurred",
              width: "12rem",
              render: (r) => (
                <span className="text-xs text-ink-500">
                  {new Date(r.occurred_at).toLocaleString()}
                </span>
              ),
            },
            {
              key: "product",
              header: "Product",
              render: (r) => <Chip tone="info">{r.product}</Chip>,
            },
            {
              key: "fact_type",
              header: "Fact type",
              render: (r) => <Chip tone="brand">{r.fact_type}</Chip>,
            },
            {
              key: "title",
              header: "Title / summary",
              render: (r) => (
                <div>
                  <div className="font-medium text-ink-900">
                    <Link
                      to={`/ops/knowledge/${encodeURIComponent(r.id)}`}
                      className="hover:underline"
                    >
                      {r.title}
                    </Link>
                  </div>
                  <div className="text-xs text-ink-500">{r.summary}</div>
                </div>
              ),
            },
            {
              key: "entity",
              header: "Entity",
              render: (r) => (
                <span className="font-mono text-[11px] text-ink-700">
                  {r.entity_type}:{r.entity_ref}
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
              key: "confidence",
              header: "Conf.",
              render: (r) => (
                <span className="font-mono text-xs">
                  {r.confidence.toFixed(2)}
                </span>
              ),
            },
            {
              key: "citation",
              header: "Citation",
              render: (r) => (
                <span className="font-mono text-[11px] text-ink-700">
                  {r.citation_ref}
                </span>
              ),
            },
          ]}
          rows={rows}
          loading={loading}
          emptyMessage="No KnowledgeFacts match those filters."
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
