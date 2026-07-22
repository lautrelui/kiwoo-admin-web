import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type { HealthSnapshot, TransportHealth } from "@/types/connect";

/// Sprint 12.x Provider Health — per-transport health board. Reuses
/// exactly the same `HealthSnapshot` for every provider so adding a
/// new transport (Meta Direct, another SMTP relay, etc.) lights up
/// on the same page with zero UI changes.
export default function ConnectProviderHealth() {
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await connectService.providersHealth();
      setSnap(d);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppLayout
      title="Provider Health"
      subtitle="Latency, failure counts, and readiness per transport"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {refreshedAt
            ? `Refreshed ${formatDateTime(refreshedAt)}${snap ? ` · Generated ${formatDateTime(snap.generated_at)}` : ""}`
            : "—"}
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && <ErrorBanner title="Could not load provider health" detail={error} className="mb-4" />}

      {!error && !snap && loading && (
        <Card className="p-10 text-center text-sm text-ink-400">Loading…</Card>
      )}

      {snap && snap.transports.length === 0 && (
        <Card className="p-10 text-center text-sm text-ink-400">
          No transports have recorded samples yet. Send at least one message so the health service can start
          tracking outcomes.
        </Card>
      )}

      {snap && snap.transports.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {snap.transports.map((t) => (
            <TransportCard key={t.transport} health={t} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function TransportCard({ health: h }: { health: TransportHealth }) {
  const badge =
    h.healthy === true
      ? { text: "Healthy", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" }
      : h.healthy === false
        ? { text: "Degraded", cls: "border-red-200 bg-red-50 text-red-700" }
        : { text: "Warming up", cls: "border-ink-200 bg-ink-50 text-ink-600" };
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>
          <span className="capitalize">{h.transport}</span>
        </CardTitle>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            badge.cls,
          )}
        >
          {badge.text}
        </span>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="p50 ms" value={h.latency_ms.p50 ?? "—"} />
          <Metric label="p95 ms" value={h.latency_ms.p95 ?? "—"} />
          <Metric label="avg ms" value={h.latency_ms.avg ?? "—"} />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">
            Last 24 hours ({h.counts_24h.total} calls)
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Metric label="Success" value={h.counts_24h.success} good />
            <Metric label="429" value={h.counts_24h.http_429} warn={h.counts_24h.http_429 > 0} />
            <Metric label="5xx" value={h.counts_24h.http_5xx} warn={h.counts_24h.http_5xx > 0} />
            <Metric
              label="Other fail"
              value={h.counts_24h.other_failure}
              warn={h.counts_24h.other_failure > 0}
            />
          </div>
        </div>
        <div className="space-y-1 text-xs text-ink-600">
          <div>
            Sample size:{" "}
            <span className="font-mono">{h.sample_size}</span>{" "}
            {h.since && (
              <span className="text-ink-400">
                (recording since {formatDateTime(h.since)})
              </span>
            )}
          </div>
          <div>
            Last success:{" "}
            <span className="text-ink-800">{formatDateTime(h.last_success_at)}</span>
          </div>
          <div>
            Last failure:{" "}
            <span className="text-ink-800">{formatDateTime(h.last_failure_at)}</span>
            {h.last_error_code && (
              <span className="ml-2 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                {h.last_error_code}
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: React.ReactNode;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/40 p-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-semibold",
          warn ? "text-red-700" : good ? "text-emerald-700" : "text-ink-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}
