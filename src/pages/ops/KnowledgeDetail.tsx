import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { PayloadViewer } from "@/components/ops/PayloadViewer";
import { Card } from "@/components/ui/Card";
import { intelligenceService } from "@/services/intelligenceService";
import type { KnowledgeFact } from "@/types/intelligence";

/**
 * Knowledge Fact Detail — full read of one row from
 * `/admin/intelligence/knowledge/:id`.
 *
 * `metadata` is rendered through PayloadViewer, which auto-redacts a
 * superset of the platform's sensitive key names. This is defense-in-
 * depth — the extractor already stripped sensitive fields at persist
 * time per the ProductContract, so this layer catches only ambient
 * mistakes.
 *
 * Links out to the source PlatformEvent, the SearchDocument link (if
 * populated), and the owning user's Platform Users detail page.
 */
export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>();
  const [fact, setFact] = useState<KnowledgeFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { fact: f } = await intelligenceService.getKnowledgeFact(id);
      setFact(f);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppLayout>
      <RefreshBar
        title={fact ? `Fact — ${fact.title}` : "Knowledge Fact"}
        subtitle={
          <Link to="/ops/knowledge" className="text-brand-600 hover:underline">
            ← Back to Knowledge Explorer
          </Link>
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      {loading && !fact ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Loading…</Card>
      ) : !fact ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Fact not found.</Card>
      ) : (
        <>
          <Card className="mt-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <F label="Fact ID">
                <span className="font-mono text-xs">{fact.id}</span>
              </F>
              <F label="Fact type">
                <Chip tone="brand">{fact.fact_type}</Chip>
              </F>
              <F label="Product">
                <Chip tone="info">{fact.product}</Chip>
              </F>
              <F label="User">
                <Link
                  to={`/ops/users/${fact.user_id}`}
                  className="text-brand-700 hover:underline"
                >
                  #{fact.user_id}
                </Link>
              </F>
              <F label="Confidence">
                <span className="font-mono">{fact.confidence.toFixed(2)}</span>
              </F>
              <F label="Occurred at">
                {new Date(fact.occurred_at).toLocaleString()}
              </F>
              <F label="Created at">
                {new Date(fact.created_at).toLocaleString()}
              </F>
              <F label="Entity type">{fact.entity_type}</F>
              <F label="Entity ref">
                <span className="font-mono text-xs">{fact.entity_ref}</span>
              </F>
              <F label="Amount">
                {fact.amount ? (
                  <span className="font-mono">
                    {fact.amount} {fact.currency ?? ""}
                  </span>
                ) : (
                  "—"
                )}
              </F>
              <F label="Citation ref" className="sm:col-span-2">
                <span className="font-mono text-xs">{fact.citation_ref}</span>
              </F>
              <F label="Title" className="sm:col-span-2 lg:col-span-3">
                <span className="text-ink-900">{fact.title}</span>
              </F>
              <F label="Summary" className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm">{fact.summary}</p>
              </F>
            </div>
          </Card>

          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Metadata
            </h2>
            <p className="mb-3 text-xs text-ink-500">
              Only fields declared <code>ai_eligible</code> for this event
              in its Product Contract can appear here. Anything matching a
              sensitive key name is additionally redacted by the viewer as
              defense-in-depth.
            </p>
            <PayloadViewer value={fact.metadata ?? {}} />
          </Card>

          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Provenance
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Source event">
                {fact.event_id ? (
                  <Link
                    to={`/ops/events/${encodeURIComponent(fact.event_id)}`}
                    className="font-mono text-xs text-brand-700 hover:underline"
                  >
                    {fact.event_id}
                  </Link>
                ) : (
                  "—"
                )}
              </F>
              <F label="Source event name">
                <span className="font-mono text-xs">
                  {fact.source_event_name}
                </span>
              </F>
              <F label="Source product">
                <Chip tone="info">{fact.source_product}</Chip>
              </F>
              <F label="Search document">
                {fact.search_document_id ? (
                  <span className="font-mono text-xs text-ink-700">
                    {fact.search_document_id}
                  </span>
                ) : (
                  <span className="text-ink-400">
                    (not linked — race with Search subscriber on live emit;
                    replay would populate)
                  </span>
                )}
              </F>
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}

function F({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink-900">{children}</div>
    </div>
  );
}
