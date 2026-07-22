import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { PresenceBadge } from "@/components/connect/PresenceBadge";
import { explainErrorCode } from "@/components/connect/errorCodes";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type { WhatsAppDiagnostics } from "@/types/connect";

/// Sprint 12.x WhatsApp Diagnostics — the operator's "is WhatsApp
/// working right now?" landing page. Every field on this page is a
/// boolean, count, ISO timestamp, closed enum, or name. Never a
/// secret value.
export default function ConnectDiagnostics() {
  const [data, setData] = useState<WhatsAppDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await connectService.whatsappDiagnostics();
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
      title="WhatsApp Diagnostics"
      subtitle="Provider state, callback lifecycle, template coverage"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {refreshedAt ? `Refreshed ${formatDateTime(refreshedAt)}` : "—"}
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <ErrorBanner
          title="Could not load diagnostics"
          detail={error}
          className="mb-4"
        />
      )}

      {!error && !data && loading && (
        <Card className="p-10 text-center text-sm text-ink-400">Loading…</Card>
      )}

      {data && (
        <>
          {/* Row 1: high-signal stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Account"
              value={data.account.configured ? "Configured" : "Not configured"}
              delta={`Provider: ${data.account.provider} · ${data.account.mode}`}
              trend={data.account.configured ? "up" : "down"}
              icon={<span>◈</span>}
            />
            <StatCard
              label="Status callback"
              value={data.callback.configured ? "Wired" : "Not wired"}
              delta={
                data.callback.last_callback_at
                  ? `Last: ${formatDateTime(data.callback.last_callback_at)}`
                  : "No callbacks recorded yet"
              }
              trend={data.callback.configured ? "up" : "down"}
              icon={<span>↺</span>}
            />
            <StatCard
              label="Templates configured"
              value={`${data.templates.configured_count} / ${data.templates.registered_count}`}
              delta={
                data.templates.missing_count > 0
                  ? `${data.templates.missing_count} missing SIDs`
                  : "All registered templates covered"
              }
              trend={
                data.templates.missing_count === 0
                  ? "up"
                  : data.templates.configured_count > 0
                    ? "flat"
                    : "down"
              }
              icon={<span>▤</span>}
            />
            <StatCard
              label="Transport health"
              value={
                data.transport_health?.healthy === true
                  ? "Healthy"
                  : data.transport_health?.healthy === false
                    ? "Degraded"
                    : "No data"
              }
              delta={
                data.transport_health
                  ? `${data.transport_health.sample_size} samples · p95 ${data.transport_health.latency_ms.p95 ?? "—"} ms`
                  : "No samples yet"
              }
              trend={
                data.transport_health?.healthy === true
                  ? "up"
                  : data.transport_health?.healthy === false
                    ? "down"
                    : "flat"
              }
              icon={<span>◉</span>}
            />
          </div>

          {/* Row 2: callback + window + last error */}
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Callback</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <KV label="Configured">
                  <PresenceBadge present={data.callback.configured} />
                </KV>
                <KV label="URL">
                  <span className="break-all text-ink-700">
                    {data.callback.url ?? "—"}
                  </span>
                </KV>
                <KV label="Last callback">
                  {formatDateTime(data.callback.last_callback_at)}
                </KV>
                <KV label="Last status">
                  {data.callback.last_callback_status ? (
                    <StatusBadge status={data.callback.last_callback_status.toUpperCase()} />
                  ) : (
                    "—"
                  )}
                </KV>
                <KV label="Signature scheme">
                  <code className="text-xs">{data.callback.signature_verification}</code>
                </KV>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversation window</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <KV label="Strategy">
                  <code className="text-xs">{data.window_strategy}</code>
                </KV>
                <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
                  <div className="font-medium text-ink-800">
                    How the provider chooses freeform vs template
                  </div>
                  <ol className="mt-1 list-decimal space-y-1 pl-4">
                    <li>
                      If inside the 24h window: freeform{" "}
                      <code className="text-[10px]">Body</code>
                    </li>
                    <li>
                      Otherwise + ContentSid registered: template{" "}
                      <code className="text-[10px]">ContentSid</code>
                    </li>
                    <li>
                      Otherwise: freeform (Meta will bounce 63016)
                    </li>
                  </ol>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last provider error</CardTitle>
              </CardHeader>
              <CardBody className="text-sm">
                {!data.last_provider_error ? (
                  <div className="text-ink-400">No errors recorded.</div>
                ) : (
                  <div className="space-y-3">
                    <KV label="Template">
                      <code className="text-xs">
                        {data.last_provider_error.template}
                      </code>
                    </KV>
                    <KV label="At">
                      {formatDateTime(data.last_provider_error.at)}
                    </KV>
                    <KV label="Code">
                      <StatusBadge
                        status={
                          data.last_provider_error.code
                            ? `ERR ${data.last_provider_error.code}`
                            : "—"
                        }
                      />
                    </KV>
                    <KV label="Decision">
                      {data.last_provider_error.delivery_decision ?? "—"}
                    </KV>
                    {(() => {
                      const info = explainErrorCode(
                        data.last_provider_error.code,
                      );
                      return info ? (
                        <ErrorBanner
                          tone={info.severity === "error" ? "error" : "warning"}
                          title={`${info.code} — ${info.title}`}
                          detail={
                            <>
                              <div>{info.explanation}</div>
                              <div className="mt-1">
                                <strong>Fix:</strong> {info.suggestion}
                              </div>
                            </>
                          }
                        />
                      ) : null;
                    })()}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Row 3: env presence */}
          <div className="mt-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Environment presence</CardTitle>
                <span className="text-xs text-ink-400">
                  Never displays values — only whether a variable is set.
                </span>
              </CardHeader>
              <CardBody>
                <EnvGrid rows={data.env_presence} />
              </CardBody>
            </Card>
          </div>

          {/* Row 4: template coverage summary */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Template coverage — {data.templates.configured_count} of{" "}
                  {data.templates.registered_count} templates have at least
                  one locale configured
                </CardTitle>
              </CardHeader>
              <CardBody>
                {data.templates.configured.length === 0 ? (
                  <div className="text-sm text-ink-400">
                    No templates have Content SIDs configured yet. Register a
                    Meta template + set{" "}
                    <code>WABA_CONTENT_SID_&lt;TEMPLATE&gt;_&lt;LOCALE&gt;</code>{" "}
                    to enable template-mode sends.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {data.templates.configured.map((t) => (
                      <div
                        key={t.template}
                        className="rounded-lg border border-ink-100 bg-ink-50/40 px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-ink-800">{t.template}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.locales.map((l) => (
                            <span
                              key={l}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
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

function EnvGrid({ rows }: { rows: { name: string; present: boolean }[] }) {
  // Group by prefix so the WABA_CONTENT_SID_* explosion doesn't drown out
  // the top-level infra flags.
  const infra = rows.filter((r) => !r.name.startsWith("WABA_CONTENT_SID_"));
  const waba = rows.filter((r) => r.name.startsWith("WABA_CONTENT_SID_"));
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          Infrastructure
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {infra.map((r) => (
            <EnvRow key={r.name} name={r.name} present={r.present} />
          ))}
        </div>
      </div>
      {waba.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            WABA Content SIDs ({waba.filter((r) => r.present).length} /{" "}
            {waba.length})
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {waba.map((r) => (
              <EnvRow key={r.name} name={r.name} present={r.present} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnvRow({ name, present }: { name: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-ink-100 bg-white px-3 py-1.5">
      <code className="truncate text-xs text-ink-700">{name}</code>
      <PresenceBadge present={present} />
    </div>
  );
}
