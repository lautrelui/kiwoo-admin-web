import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type { WatchdogSweepResult } from "@/types/connect";

/// Sprint 12.x Watchdog Last Sweep — expose the watchdog's most recent
/// reconciliation batch. Each request to this page also RUNS a fresh
/// sweep server-side (backend endpoint runs synchronously). Handy when
/// an operator wants to prove the watchdog can find + heal orphans
/// without waiting for the next minute boundary.
export default function ConnectWatchdog() {
  const [data, setData] = useState<WatchdogSweepResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await connectService.watchdogLastSweep();
      setData(d);
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
      title="Status Watchdog"
      subtitle="Heals ConnectMessage rows that never received a status callback"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {refreshedAt ? `Refreshed ${formatDateTime(refreshedAt)}` : "—"}
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Sweeping…" : "Run sweep now"}
        </Button>
      </div>

      {error && (
        <ErrorBanner title="Watchdog sweep failed" detail={error} className="mb-4" />
      )}

      {loading && !data && !error && (
        <Card className="p-10 text-center text-sm text-ink-400">Sweeping…</Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard
              label="Considered"
              value={data.considered}
              delta="Orphan rows checked this sweep"
              icon={<span>◔</span>}
            />
            <StatCard
              label="Healed"
              value={data.healed}
              trend={data.healed > 0 ? "up" : "flat"}
              delta="Twilio state advanced past queued"
              icon={<span>✓</span>}
            />
            <StatCard
              label="Still queued"
              value={data.stillQueued}
              trend="flat"
              delta="Twilio still reports queued — waiting on Meta"
              icon={<span>◐</span>}
            />
            <StatCard
              label="Errored"
              value={data.errored}
              trend={data.errored > 0 ? "down" : "flat"}
              delta="Twilio status lookup threw"
              icon={<span>!</span>}
            />
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About the watchdog</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <p className="text-ink-700">
                  Webhook is the source of truth. When Twilio's{" "}
                  <code>StatusCallback</code> fires,{" "}
                  <code>ConnectMessage</code> updates within ~1s. The watchdog
                  runs every minute to catch rows where the callback silently
                  dropped (Twilio dropped it, our proxy 502'd, the container
                  was restarting, etc).
                </p>
                <p className="text-ink-700">
                  Rows only qualify when they've been{" "}
                  <code>queued</code> for more than{" "}
                  <span className="font-mono">2 minutes</span>. Up to{" "}
                  <span className="font-mono">25</span> rows are
                  reconciled per tick — enough to catch bursts, low enough to
                  stay under Twilio's 100 req/s account limit.
                </p>
                <p className="text-ink-700">
                  Cutoff for this sweep:{" "}
                  <span className="font-mono">{formatDateTime(data.cutoff)}</span>
                </p>
                <p className="text-ink-500">
                  Freeze the watchdog during a vendor outage by setting{" "}
                  <code>CONNECT_WATCHDOG_ENABLED=false</code> in prod .env and
                  force-recreating the backend.
                </p>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}
