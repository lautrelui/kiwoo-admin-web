import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { PayloadViewer } from "@/components/ops/PayloadViewer";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import { intelligenceService } from "@/services/intelligenceService";
import type { ScenarioRunReport } from "@/types/intelligence";

/**
 * Sprint 13.9 Task 133 — Scenario Run Detail.
 *
 * Prints:
 *   - the certification summary (PASS/FAIL, timestamp, env, mode)
 *   - each assertion with expected vs actual, error message on
 *     failure (PayloadViewer redaction on both sides)
 *   - each artifact the run produced (typed rows with ref + metadata)
 *
 * The header includes a "Copy report" affordance so operators can
 * paste the summary into an incident ticket or release note.
 */
function statusTone(status: string) {
  if (status === "passed") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "muted";
}

export default function ScenarioRunDetail() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ScenarioRunReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await intelligenceService.getScenarioRun(id);
      setReport(r);
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

  async function copyReport() {
    if (!report) return;
    const text = [
      `# Kiwoo Scenario Certification Report`,
      ``,
      `- **Scenario:** ${report.run.scenario_name} (\`${report.run.scenario_code}\`)`,
      `- **Status:** ${report.run.status.toUpperCase()}`,
      `- **Mode:** ${report.run.mode}`,
      `- **Environment:** ${report.run.environment}`,
      `- **Started at:** ${report.run.started_at}`,
      `- **Finished at:** ${report.run.finished_at ?? "—"}`,
      `- **Duration:** ${report.run.duration_ms ?? "—"}ms`,
      `- **Assertions:** ${report.counts.passed} passed / ${report.counts.failed} failed / ${report.counts.skipped} skipped`,
      `- **Artifacts:** ${report.counts.total_artifacts}`,
      ``,
      report.assertions
        .map(
          (a) =>
            `- [${a.status.toUpperCase()}] ${a.assertion_code} — ${a.title}${a.error_message ? ` (error: ${a.error_message})` : ""}`,
        )
        .join("\n"),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  return (
    <AppLayout>
      <RefreshBar
        title={report ? report.run.scenario_name : "Scenario Run"}
        subtitle={
          <Link to="/ops/scenarios" className="text-brand-600 hover:underline">
            ← Back to Scenario Runner
          </Link>
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
        right={
          report ? (
            <button
              onClick={copyReport}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
            >
              {copied ? "Copied ✓" : "Copy report"}
            </button>
          ) : null
        }
      />

      <ErrorNote error={error} className="mt-4" />

      {loading && !report ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Loading…</Card>
      ) : !report ? (
        <Card className="mt-4 p-5 text-sm text-ink-400">Run not found.</Card>
      ) : (
        <>
          {/* Certification summary strip */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Overall"
              value={
                <Chip tone={statusTone(report.run.status)}>
                  {report.run.status.toUpperCase()}
                </Chip>
              }
            />
            <StatCard label="Passed" value={report.counts.passed.toString()} />
            <StatCard label="Failed" value={report.counts.failed.toString()} />
            <StatCard
              label="Skipped"
              value={report.counts.skipped.toString()}
            />
            <StatCard
              label="Artifacts"
              value={report.counts.total_artifacts.toString()}
            />
            <StatCard
              label="Duration"
              value={
                report.run.duration_ms !== null
                  ? `${report.run.duration_ms}ms`
                  : "—"
              }
            />
          </div>

          <Card className="mt-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <F label="Scenario code">
                <span className="font-mono text-xs">
                  {report.run.scenario_code}
                </span>
              </F>
              <F label="Mode">
                <Chip
                  tone={
                    report.run.mode === "destructive_test"
                      ? "danger"
                      : report.run.mode === "safe_live"
                        ? "brand"
                        : "muted"
                  }
                >
                  {report.run.mode}
                </Chip>
              </F>
              <F label="Environment">{report.run.environment}</F>
              <F label="Started by">
                {report.run.started_by_user_id ? (
                  <Link
                    to={`/ops/users/${report.run.started_by_user_id}`}
                    className="text-brand-700 hover:underline"
                  >
                    #{report.run.started_by_user_id}
                  </Link>
                ) : (
                  "—"
                )}
              </F>
              <F label="Started at">
                {new Date(report.run.started_at).toLocaleString()}
              </F>
              <F label="Finished at">
                {report.run.finished_at
                  ? new Date(report.run.finished_at).toLocaleString()
                  : "—"}
              </F>
            </div>
          </Card>

          {/* Assertions */}
          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Assertions ({report.assertions.length})
            </h2>
            <DataTable
              columns={[
                {
                  key: "status",
                  header: "Status",
                  render: (a) => (
                    <Chip tone={statusTone(a.status)}>{a.status}</Chip>
                  ),
                },
                {
                  key: "code",
                  header: "Code",
                  render: (a) => (
                    <span className="font-mono text-[11px] text-ink-700">
                      {a.assertion_code}
                    </span>
                  ),
                },
                {
                  key: "title",
                  header: "Title",
                  render: (a) => (
                    <div>
                      <div className="text-ink-900">{a.title}</div>
                      {a.error_message && (
                        <div className="text-xs text-red-700">
                          {a.error_message}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "expected",
                  header: "Expected",
                  render: (a) =>
                    a.expected_json === null ||
                    a.expected_json === undefined ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <div className="max-w-sm">
                        <PayloadViewer value={a.expected_json} maxHeight="6rem" />
                      </div>
                    ),
                },
                {
                  key: "actual",
                  header: "Actual",
                  render: (a) =>
                    a.actual_json === null || a.actual_json === undefined ? (
                      <span className="text-ink-400">—</span>
                    ) : (
                      <div className="max-w-sm">
                        <PayloadViewer value={a.actual_json} maxHeight="6rem" />
                      </div>
                    ),
                },
              ]}
              rows={report.assertions}
              emptyMessage="No assertions recorded."
              rowKey={(a) => a.id}
            />
          </Card>

          {/* Artifacts */}
          <Card className="mt-6 p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">
              Artifacts ({report.artifacts.length})
            </h2>
            <DataTable
              columns={[
                {
                  key: "type",
                  header: "Type",
                  render: (a) => <Chip tone="info">{a.artifact_type}</Chip>,
                },
                {
                  key: "ref",
                  header: "Ref",
                  render: (a) => (
                    <span className="font-mono text-[11px]">{a.artifact_ref}</span>
                  ),
                },
                {
                  key: "meta",
                  header: "Metadata",
                  render: (a) =>
                    a.metadata_json ? (
                      <div className="max-w-md">
                        <PayloadViewer value={a.metadata_json} maxHeight="6rem" />
                      </div>
                    ) : (
                      <span className="text-ink-400">—</span>
                    ),
                },
                {
                  key: "when",
                  header: "When",
                  render: (a) => (
                    <span className="text-xs text-ink-500">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  ),
                },
              ]}
              rows={report.artifacts}
              emptyMessage="No artifacts recorded."
              rowKey={(a) => a.id}
            />
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
