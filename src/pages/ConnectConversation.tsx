import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { explainErrorCode } from "@/components/connect/errorCodes";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type {
  ConversationInspection,
  RecentOutbound,
} from "@/types/connect";

const E164_HINT = "Include country code with the + prefix (e.g. +15142203421).";

/// Sprint 12.x Conversation Inspector — enter a phone number, see
/// whether the 24-hour WhatsApp window is open, and the provider's
/// would-be decision for the next send.
export default function ConnectConversation() {
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [data, setData] = useState<ConversationInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    if (!/^\+\d{10,15}$/.test(recipient.trim())) {
      setError(`Enter a valid E.164 phone number. ${E164_HINT}`);
      return;
    }
    setLoading(true);
    try {
      const d = await connectService.inspectConversation(recipient.trim(), channel);
      setData(d);
      setRefreshedAt(new Date());
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [recipient, channel]);

  return (
    <AppLayout
      title="Conversation Inspector"
      subtitle="Check the 24-hour window state and the last few outbound messages for a phone number"
    >
      <Card className="mb-6">
        <CardBody>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
                Recipient (E.164)
              </label>
              <input
                type="tel"
                autoComplete="off"
                inputMode="tel"
                placeholder="+15142203421"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as "whatsapp" | "sms")}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <Button type="submit" loading={loading} disabled={loading || !recipient}>
              Inspect
            </Button>
            {data && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void load()}
                disabled={loading}
              >
                Refresh
              </Button>
            )}
          </form>
          <p className="mt-2 text-xs text-ink-400">{E164_HINT}</p>
          {refreshedAt && (
            <p className="mt-1 text-xs text-ink-400">
              Refreshed {formatDateTime(refreshedAt)}
            </p>
          )}
        </CardBody>
      </Card>

      {error && <ErrorBanner title="Inspection failed" detail={error} className="mb-4" />}

      {!data && !loading && !error && (
        <Card className="p-10 text-center text-sm text-ink-400">
          Enter a phone number above to inspect its conversation state.
        </Card>
      )}

      {loading && !data && (
        <Card className="p-10 text-center text-sm text-ink-400">Loading…</Card>
      )}

      {data && <InspectionResult data={data} />}
    </AppLayout>
  );
}

function InspectionResult({ data }: { data: ConversationInspection }) {
  const open = data.conversation_window.status === "open";
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Window status"
          value={open ? "Open" : "Closed"}
          delta={
            open
              ? `Expires ${formatDateTime(data.conversation_window.expires_at)}`
              : "No inbound in the last 24h"
          }
          trend={open ? "up" : "down"}
          icon={<span>◔</span>}
        />
        <StatCard
          label="Would-be decision"
          value={data.would_be_decision === "freeform" ? "Freeform Body" : "Template ContentSid"}
          delta={
            data.would_be_decision === "freeform"
              ? "Send text directly — inside the 24h window"
              : "Requires a WABA-approved Content SID for the target template + locale"
          }
          trend={data.would_be_decision === "freeform" ? "up" : "flat"}
          icon={<span>◈</span>}
        />
        <StatCard
          label="Opened at"
          value={
            data.conversation_window.opened_at
              ? formatDateTime(data.conversation_window.opened_at)
              : "—"
          }
          delta={
            open
              ? `Recipient ${data.recipient_masked} · ${data.channel}`
              : `Ask recipient ${data.recipient_masked} to send a message to open the window`
          }
          icon={<span>⇦</span>}
        />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent outbound (last 5)</CardTitle>
          </CardHeader>
          <CardBody>
            <DataTable<RecentOutbound>
              rowKey={(r) => r.id}
              rows={data.recent_outbound}
              emptyMessage="No outbound messages yet for this recipient."
              columns={[
                {
                  key: "created_at",
                  header: "Sent at",
                  render: (r) => (
                    <span className="text-ink-700">{formatDateTime(r.created_at)}</span>
                  ),
                },
                {
                  key: "template",
                  header: "Template",
                  render: (r) => <code className="text-xs">{r.template}</code>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusBadge status={r.status.toUpperCase()} />,
                },
                {
                  key: "decision",
                  header: "Decision",
                  render: (r) => (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        r.decision === "freeform" || r.decision === "forced_freeform"
                          ? "bg-sky-50 text-sky-700"
                          : r.decision === "template" || r.decision === "forced_template"
                            ? "bg-brand-50 text-brand-700"
                            : "bg-ink-100 text-ink-500",
                      )}
                    >
                      {r.decision ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "error_code",
                  header: "Error",
                  render: (r) => {
                    if (!r.error_code) return <span className="text-ink-400">—</span>;
                    const info = explainErrorCode(r.error_code);
                    return (
                      <span
                        className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"
                        title={info ? info.title : undefined}
                      >
                        {r.error_code}
                      </span>
                    );
                  },
                },
                {
                  key: "id",
                  header: "Timeline",
                  render: (r) => (
                    <Link
                      to={`/connect/messages/${encodeURIComponent(r.id)}/timeline`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      View →
                    </Link>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
