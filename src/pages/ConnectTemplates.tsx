import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ErrorBanner } from "@/components/connect/ErrorBanner";
import { PresenceBadge } from "@/components/connect/PresenceBadge";
import { apiErrorMessage } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { connectService } from "@/services/connectService";
import type { TemplateRegistryResponse, TemplateRow } from "@/types/connect";

/// Sprint 12.x Template Registry Inspector — every template × locale
/// pair with configured / missing indicator. Operators use this to see
/// which Meta-approved templates still need `WABA_CONTENT_SID_<T>_<L>`
/// env vars wired.
export default function ConnectTemplates() {
  const [data, setData] = useState<TemplateRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "ready" | "partial" | "no_sids">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await connectService.templates();
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

  const counts = countByStatus(data?.templates ?? []);
  const filtered =
    filter === "all"
      ? data?.templates ?? []
      : (data?.templates ?? []).filter((t) => t.status === filter);

  return (
    <AppLayout
      title="Template Registry"
      subtitle="Coverage of Meta-approved WhatsApp Message Templates per locale"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          {refreshedAt ? `Refreshed ${formatDateTime(refreshedAt)}` : "—"}
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && <ErrorBanner title="Could not load templates" detail={error} className="mb-4" />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard
              label="Registered"
              value={data.templates.length}
              delta={`${data.supported_locales.length} supported locales`}
              icon={<span>▤</span>}
            />
            <StatCard
              label="Ready (all locales)"
              value={counts.ready}
              trend={counts.ready > 0 ? "up" : "flat"}
              delta="All locales have a Content SID"
              icon={<span>✓</span>}
            />
            <StatCard
              label="Partial coverage"
              value={counts.partial}
              trend={counts.partial > 0 ? "flat" : "up"}
              delta="Some locales configured"
              icon={<span>◐</span>}
            />
            <StatCard
              label="No SIDs configured"
              value={counts.no_sids}
              trend={counts.no_sids > 0 ? "down" : "up"}
              delta="Freeform will 63016 outside window"
              icon={<span>○</span>}
            />
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Templates</CardTitle>
                <div className="flex gap-2 text-xs">
                  {(["all", "ready", "partial", "no_sids"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "rounded-full border px-3 py-1 font-medium capitalize",
                        filter === f
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-ink-200 bg-white text-ink-500 hover:bg-ink-50",
                      )}
                    >
                      {f.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardBody>
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-ink-400">
                    No templates match this filter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((t) => (
                      <TemplateCard
                        key={t.key}
                        template={t}
                        supportedLocales={data.supported_locales}
                      />
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

function TemplateCard({
  template,
  supportedLocales,
}: {
  template: TemplateRow;
  supportedLocales: string[];
}) {
  const statusStyles: Record<TemplateRow["status"], string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    partial: "border-amber-200 bg-amber-50 text-amber-700",
    no_sids: "border-ink-200 bg-ink-50 text-ink-500",
  };
  const statusCopy: Record<TemplateRow["status"], string> = {
    ready: "Ready",
    partial: "Partial",
    no_sids: "No SIDs",
  };

  const missingLocales = supportedLocales.filter(
    (l) => !template.locales.some((tl) => tl.locale === l && tl.content_sid === "configured"),
  );

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm font-semibold text-ink-900">
            {template.key}
          </div>
          <div className="mt-0.5 text-xs text-ink-400">
            Env var pattern:{" "}
            <code className="text-[11px]">
              WABA_CONTENT_SID_{template.key.toUpperCase().replace(/-/g, "_")}_&lt;LOCALE&gt;
            </code>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusStyles[template.status],
          )}
        >
          {statusCopy[template.status]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {template.locales.map((l) => (
          <div
            key={l.locale}
            className="flex items-center justify-between rounded-md border border-ink-100 bg-ink-50/40 px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs text-ink-700">{l.locale}</span>
            <PresenceBadge
              present={l.content_sid === "configured"}
              missingLabel="Missing SID"
            />
          </div>
        ))}
      </div>

      {template.status !== "ready" && missingLocales.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
          {missingLocales.length} locale{missingLocales.length === 1 ? "" : "s"}{" "}
          need Content SID{missingLocales.length === 1 ? "" : "s"}:{" "}
          <span className="font-mono">{missingLocales.join(", ")}</span>. Set{" "}
          <code>
            WABA_CONTENT_SID_{template.key.toUpperCase().replace(/-/g, "_")}_&lt;LOCALE&gt;
          </code>{" "}
          in prod .env once the Meta template is approved.
        </div>
      )}
    </div>
  );
}

function countByStatus(rows: TemplateRow[]) {
  const c: Record<TemplateRow["status"], number> = {
    ready: 0,
    partial: 0,
    no_sids: 0,
  };
  for (const r of rows) c[r.status] += 1;
  return c;
}
