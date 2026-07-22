import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { PayloadViewer } from "@/components/ops/PayloadViewer";
import { Card } from "@/components/ui/Card";
import { intelligenceService } from "@/services/intelligenceService";
import type { Notification } from "@/types/intelligence";

export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const [n, setN] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { notification } = await intelligenceService.getNotification(id);
      setN(notification);
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
        title="Notification Detail"
        subtitle={
          <Link
            to="/ops/notifications"
            className="text-brand-600 hover:underline"
          >
            ← Back to Notification Explorer
          </Link>
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      {loading && !n ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Loading…</Card>
      ) : !n ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">
          Notification not found.
        </Card>
      ) : (
        <>
          <Card className="mt-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <F label="ID">
                <span className="font-mono text-xs">{n.id}</span>
              </F>
              <F label="User">
                <Link
                  to={`/ops/users/${n.user_id}`}
                  className="text-brand-700 hover:underline"
                >
                  #{n.user_id}
                </Link>
              </F>
              <F label="Product">
                <Chip tone="info">{n.product ?? "—"}</Chip>
              </F>
              <F label="Status">
                <Chip tone={n.status === "unread" ? "warning" : "muted"}>
                  {n.status}
                </Chip>
              </F>
              <F label="Event">
                {n.event_id ? (
                  <Link
                    to={`/ops/events/${encodeURIComponent(n.event_id)}`}
                    className="font-mono text-xs text-brand-700 hover:underline"
                  >
                    {n.event_id}
                  </Link>
                ) : (
                  "—"
                )}
              </F>
              <F label="Event type">{n.event_type ?? "—"}</F>
              <F label="Channel">{n.channel ?? "—"}</F>
              <F label="Correlation">
                {n.correlation_id ? (
                  <span className="font-mono text-xs">{n.correlation_id}</span>
                ) : (
                  "—"
                )}
              </F>
              <F label="Created">
                {new Date(n.created_at).toLocaleString()}
              </F>
              <F label="Title" className="sm:col-span-2 lg:col-span-3">
                {n.title}
              </F>
              {n.body && (
                <F label="Body" className="sm:col-span-2 lg:col-span-3">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                </F>
              )}
            </div>
          </Card>

          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Metadata
            </h2>
            <PayloadViewer value={n.metadata ?? {}} />
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
