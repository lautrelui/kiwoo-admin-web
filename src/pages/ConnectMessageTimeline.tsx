import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { explainErrorCode } from "@/components/connect/errorCodes";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type { MessageTimeline, TimelineWaypoint } from "@/types/connect";

/// Sprint 12.x Message Timeline — the lifecycle of a single
/// ConnectMessage, waypoint by waypoint. If the row failed the
/// terminal waypoint carries the error code + suggested_fix which we
/// render in a call-out box; 63016 gets the plain-English explanation
/// per the ops runbook.
export default function ConnectMessageTimeline() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = idParam ?? "";
  const [data, setData] = useState<MessageTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const d = await connectService.messageTimeline(id);
      setData(d);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppLayout
      title="Message Timeline"
      subtitle={id ? `ConnectMessage ${id}` : "Load a specific message from the Conversation Inspector."}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {refreshedAt ? `Refreshed ${formatDateTime(refreshedAt)}` : "—"}
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading || !id}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {!id && (
        <Card className="p-10 text-center text-sm text-ink-400">
          Provide a ConnectMessage id in the URL path.{" "}
          <Link
            to="/connect/conversation"
            className="font-medium text-brand-700 hover:underline"
          >
            Go to the Conversation Inspector
          </Link>{" "}
          to pick one from the recent-outbound list.
        </Card>
      )}

      {error && <ErrorBanner title="Could not load timeline" detail={error} className="mb-4" />}

      {loading && !data && !error && (
        <Card className="p-10 text-center text-sm text-ink-400">Loading…</Card>
      )}

      {data && <TimelineView data={data} />}
    </AppLayout>
  );
}

function TimelineView({ data }: { data: MessageTimeline }) {
  const failed = data.waypoints.find((w) => w.key === "failed");
  const errorInfo = failed ? explainErrorCode(failed.error_code ?? null) : null;

  return (
    <>
      {failed && errorInfo && (
        <ErrorBanner
          className="mb-4"
          tone={errorInfo.severity === "error" ? "error" : "warning"}
          title={`${errorInfo.code} — ${errorInfo.title}`}
          detail={
            <>
              <div>{errorInfo.explanation}</div>
              <div className="mt-1">
                <strong>Fix:</strong> {errorInfo.suggestion}
              </div>
            </>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardBody>
            <ol className="space-y-4">
              {data.waypoints.map((w, i) => (
                <WaypointRow key={w.key} w={w} isLast={i === data.waypoints.length - 1} />
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <KV label="Channel">
              <code className="text-xs">{data.channel}</code>
            </KV>
            <KV label="Template">
              <code className="text-xs">{data.template}</code>
            </KV>
            <KV label="Recipient">
              <span>{data.recipient_masked}</span>
            </KV>
            <KV label="Status">
              <StatusBadge status={data.status.toUpperCase()} />
            </KV>
            <KV label="Decision">
              <span>{data.delivery_decision ?? "—"}</span>
            </KV>
            <KV label="Send ID">
              <code className="break-all text-[11px]">{data.send_id ?? "—"}</code>
            </KV>
            {data.waba_content_sid && (
              <KV label="Content SID">
                <code className="break-all text-[11px]">
                  {data.waba_content_sid}
                </code>
              </KV>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function WaypointRow({ w, isLast }: { w: TimelineWaypoint; isLast: boolean }) {
  const isFailure = w.key === "failed";
  const reachedRing = isFailure
    ? "border-red-400 bg-red-500"
    : w.reached
      ? "border-emerald-400 bg-emerald-500"
      : "border-ink-200 bg-white";
  const reachedRingText =
    isFailure || w.reached ? "text-white" : "text-ink-300";

  return (
    <li className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold",
            reachedRing,
            reachedRingText,
          )}
        >
          {isFailure ? "!" : w.reached ? "✓" : ""}
        </div>
        {!isLast && (
          <div className={cn("mt-1 w-0.5 flex-1", w.reached ? "bg-emerald-200" : "bg-ink-100")} />
        )}
      </div>
      <div className="flex-1 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "text-sm font-semibold",
              isFailure ? "text-red-700" : w.reached ? "text-ink-900" : "text-ink-400",
            )}
          >
            {w.label}
          </div>
          <div className="text-xs text-ink-400">{formatDateTime(w.at)}</div>
        </div>
        {w.detail && (
          <div className="mt-1 text-xs text-ink-500 break-all">{w.detail}</div>
        )}
        {isFailure && w.error_code && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs">
            <div className="font-medium text-red-800">
              Error code: <span className="font-mono">{w.error_code}</span>
            </div>
            {w.error_message && (
              <div className="mt-0.5 text-red-700">{w.error_message}</div>
            )}
            {w.suggested_fix && (
              <div className="mt-1 text-red-800">
                <strong>Suggested fix:</strong> {w.suggested_fix}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="text-right text-sm text-ink-800">{children}</div>
    </div>
  );
}
