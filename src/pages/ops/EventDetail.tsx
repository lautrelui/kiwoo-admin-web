import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { PayloadViewer } from "@/components/ops/PayloadViewer";
import { Card } from "@/components/ui/Card";
import { intelligenceService } from "@/services/intelligenceService";
import type { PlatformEvent } from "@/types/intelligence";

/**
 * Event detail — the "why did that Notification / Activity / Search
 * document appear?" answer. Shows the identity, correlation, and
 * payload of one PlatformEvent, with deep links to every downstream
 * projection that reacted to it (via correlation_id).
 */
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { event: e } = await intelligenceService.getEvent(id);
      setEvent(e);
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
        title="Event Detail"
        subtitle={
          <Link to="/ops/events" className="text-brand-600 hover:underline">
            ← Back to Event Explorer
          </Link>
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      {loading && !event ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Loading…</Card>
      ) : !event ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">
          Event not found.
        </Card>
      ) : (
        <>
          <Card className="mt-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <F label="Event ID">
                <span className="font-mono text-xs">{event.event_id}</span>
              </F>
              <F label="Type">{event.event_type}</F>
              <F label="Schema">v{event.schema_version ?? 1}</F>
              <F label="Occurred at">
                {new Date(event.occurred_at).toLocaleString()}
              </F>
              <F label="Product">
                <Chip tone="info">{event.source_product ?? "—"}</Chip>
              </F>
              <F label="Tenant">{event.tenant_ref ?? "—"}</F>
              <F label="Actor">{event.actor_ref ?? "—"}</F>
              <F label="Subject">{event.subject_ref ?? "—"}</F>
              <F label="Correlation">
                {event.correlation_id ? (
                  <Link
                    to={`/ops/events?correlation=${encodeURIComponent(
                      event.correlation_id,
                    )}`}
                    className="font-mono text-xs text-brand-700 hover:underline"
                  >
                    {event.correlation_id}
                  </Link>
                ) : (
                  "—"
                )}
              </F>
              <F label="Trace">
                {event.trace_id ? (
                  <span className="font-mono text-xs">{event.trace_id}</span>
                ) : (
                  "—"
                )}
              </F>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink-900">
                Payload
              </h2>
              <PayloadViewer value={event.payload ?? {}} />
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink-900">
                Metadata
              </h2>
              <PayloadViewer value={event.metadata ?? {}} />
            </Card>
          </div>

          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Downstream projections
            </h2>
            <p className="mb-3 text-xs text-ink-500">
              This event may have produced notifications, activity, and search
              rows. Follow the correlation id to see the full fan-out.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/ops/notifications?event_id=${encodeURIComponent(event.event_id)}`}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
              >
                → Notifications for this event
              </Link>
              <Link
                to={`/ops/activity?event_id=${encodeURIComponent(event.event_id)}`}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
              >
                → Activity rows for this event
              </Link>
              {event.correlation_id && (
                <Link
                  to={`/ops/events?correlation=${encodeURIComponent(event.correlation_id)}`}
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
                >
                  → Whole correlation trail
                </Link>
              )}
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink-900">{children}</div>
    </div>
  );
}
