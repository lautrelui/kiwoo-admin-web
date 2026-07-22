import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  FilterBar,
  FilterField,
  FilterSelect,
} from "@/components/ops/FilterBar";
import { intelligenceService } from "@/services/intelligenceService";
import type {
  ScenarioCatalogEntry,
  ScenarioMode,
  ScenarioRun,
} from "@/types/intelligence";

/**
 * Sprint 13.9 Task 133 — Operations Center Scenario Runner.
 *
 * Renders the scenario catalog + a form to launch a run + the last
 * page of recent runs. Detail lives on `/ops/scenarios/runs/:id`.
 *
 * Safety UX:
 *   - The mode selector defaults to a scenario's LEAST risky
 *     supported mode.
 *   - Selecting `destructive_test` shows a red warning banner AND
 *     opens a ConfirmDialog before firing.
 *   - The run form pretty-prints an example parameters object per
 *     scenario so the operator knows what shape the backend
 *     expects.
 */
function statusTone(status: string) {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "danger";
    case "running":
      return "warning";
    case "pending":
      return "muted";
    case "cancelled":
      return "muted";
    default:
      return "muted";
  }
}

function riskTone(risk: string) {
  switch (risk) {
    case "safe":
      return "success";
    case "medium":
      return "warning";
    case "destructive":
      return "danger";
    default:
      return "muted";
  }
}

export default function ScenarioRunner() {
  const [catalog, setCatalog] = useState<ScenarioCatalogEntry[]>([]);
  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [codeFilter, setCodeFilter] = useState<string>("");

  const [runFor, setRunFor] = useState<ScenarioCatalogEntry | null>(null);
  const [runMode, setRunMode] = useState<ScenarioMode>("dry_run");
  const [runParams, setRunParams] = useState<string>("{}");
  const [runError, setRunError] = useState<unknown>(null);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      intelligenceService.listScenarios(),
      intelligenceService.listScenarioRuns({
        status: statusFilter || undefined,
        scenario_code: codeFilter || undefined,
        limit: 25,
      }),
    ]);
    if (results[0].status === "fulfilled") {
      setCatalog(results[0].value.scenarios);
    } else {
      setError(results[0].reason);
    }
    if (results[1].status === "fulfilled") {
      setRuns(results[1].value.runs);
    }
    setLoading(false);
    setRefreshedAt(new Date());
  }, [statusFilter, codeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openRunForm(s: ScenarioCatalogEntry) {
    setRunFor(s);
    // Default to the LEAST risky supported mode.
    const safest =
      s.supported_modes.find((m) => m === "dry_run") ??
      s.supported_modes.find((m) => m === "safe_live") ??
      s.supported_modes[0] ??
      "dry_run";
    setRunMode(safest);
    setRunParams("{}");
    setRunError(null);
  }

  async function submitRun() {
    if (!runFor) return;
    let parameters: Record<string, unknown> = {};
    try {
      parameters = JSON.parse(runParams);
    } catch {
      setRunError(new Error("parameters must be valid JSON"));
      return;
    }
    setRunSubmitting(true);
    setRunError(null);
    try {
      const r = await intelligenceService.runScenario(runFor.code, {
        mode: runMode,
        parameters,
      });
      setRunFor(null);
      navigate(`/ops/scenarios/runs/${encodeURIComponent(r.run_id)}`);
    } catch (e) {
      setRunError(e);
    } finally {
      setRunSubmitting(false);
      setConfirmOpen(false);
    }
  }

  const passRate = (() => {
    if (runs.length === 0) return null;
    const passed = runs.filter((r) => r.status === "passed").length;
    return `${passed}/${runs.length}`;
  })();

  return (
    <AppLayout>
      <RefreshBar
        title="Scenario Runner"
        subtitle={
          passRate
            ? `Certification catalog · recent ${passRate} passed`
            : "Certification catalog"
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      {/* Catalog */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Scenario catalog ({catalog.length})
        </h2>
        <p className="mb-3 text-xs text-ink-500">
          Kiwoo is certified journey by journey. Each scenario declares its
          risk level and supported modes. `destructive_test` is blocked in
          production unless the env var
          <code className="mx-1 rounded bg-ink-100 px-1">
            SCENARIO_RUNNER_ALLOW_DESTRUCTIVE=true
          </code>{" "}
          is set.
        </p>
        <DataTable
          columns={[
            {
              key: "code",
              header: "Code",
              render: (r) => (
                <span className="font-mono text-xs text-ink-800">{r.code}</span>
              ),
            },
            {
              key: "name",
              header: "Scenario",
              render: (r) => (
                <div>
                  <div className="font-medium text-ink-900">{r.name}</div>
                  <div className="text-xs text-ink-500">{r.description}</div>
                </div>
              ),
            },
            {
              key: "risk",
              header: "Risk",
              render: (r) => <Chip tone={riskTone(r.risk_level)}>{r.risk_level}</Chip>,
            },
            {
              key: "modes",
              header: "Modes",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.supported_modes.map((m) => (
                    <Chip
                      key={m}
                      tone={
                        m === "destructive_test"
                          ? "danger"
                          : m === "safe_live"
                            ? "brand"
                            : "muted"
                      }
                    >
                      {m}
                    </Chip>
                  ))}
                </div>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openRunForm(r)}
                >
                  Run…
                </Button>
              ),
            },
          ]}
          rows={catalog}
          loading={loading}
          emptyMessage="No scenarios registered."
          rowKey={(r) => r.code}
        />
      </Card>

      {/* Run form (inline modal-ish) */}
      {runFor && (
        <Card className="mt-4 border-brand-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              Run: {runFor.name}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setRunFor(null)}>
              Close
            </Button>
          </div>
          <p className="mb-2 text-xs text-ink-500">{runFor.description}</p>
          <FilterBar>
            <FilterField label="Mode">
              <FilterSelect
                value={runMode}
                onChange={(e) => setRunMode(e.target.value as ScenarioMode)}
              >
                {runFor.supported_modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>
            <FilterField label="Parameters (JSON)" className="min-w-[320px]">
              <textarea
                className="rounded-md border border-ink-200 bg-white px-2 py-1 font-mono text-xs shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={4}
                value={runParams}
                onChange={(e) => setRunParams(e.target.value)}
              />
            </FilterField>
          </FilterBar>
          {runMode === "destructive_test" && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <b>Destructive mode.</b> Only allowed in production if{" "}
              <code>SCENARIO_RUNNER_ALLOW_DESTRUCTIVE=true</code>. You will be
              asked to confirm before firing.
            </div>
          )}
          <ErrorNote error={runError} className="mt-3" />
          <div className="mt-3 flex gap-2">
            <Button
              disabled={runSubmitting}
              onClick={() => {
                if (runMode === "destructive_test") {
                  setConfirmOpen(true);
                } else {
                  void submitRun();
                }
              }}
            >
              {runSubmitting ? "Running…" : "Run scenario"}
            </Button>
          </div>
        </Card>
      )}

      {/* Recent runs */}
      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Recent runs
        </h2>
        <FilterBar>
          <FilterField label="Status">
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Any</option>
              <option value="passed">passed</option>
              <option value="failed">failed</option>
              <option value="running">running</option>
              <option value="cancelled">cancelled</option>
              <option value="pending">pending</option>
            </FilterSelect>
          </FilterField>
          <FilterField label="Scenario">
            <FilterSelect
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
            >
              <option value="">Any</option>
              {catalog.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterBar>

        <div className="mt-3">
          <DataTable
            columns={[
              {
                key: "when",
                header: "Started",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.started_at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "scenario",
                header: "Scenario",
                render: (r) => (
                  <Link
                    to={`/ops/scenarios/runs/${encodeURIComponent(r.id)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.scenario_name}
                  </Link>
                ),
              },
              {
                key: "mode",
                header: "Mode",
                render: (r) => (
                  <Chip
                    tone={
                      r.mode === "destructive_test"
                        ? "danger"
                        : r.mode === "safe_live"
                          ? "brand"
                          : "muted"
                    }
                  >
                    {r.mode}
                  </Chip>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <Chip tone={statusTone(r.status)}>{r.status}</Chip>
                ),
              },
              {
                key: "duration",
                header: "Duration",
                render: (r) => (
                  <span className="font-mono text-xs">
                    {r.duration_ms !== null ? `${r.duration_ms}ms` : "…"}
                  </span>
                ),
              },
              {
                key: "user",
                header: "Started by",
                render: (r) =>
                  r.started_by_user_id ? (
                    <Link
                      to={`/ops/users/${r.started_by_user_id}`}
                      className="text-brand-700 hover:underline"
                    >
                      #{r.started_by_user_id}
                    </Link>
                  ) : (
                    <span className="text-ink-400">—</span>
                  ),
              },
            ]}
            rows={runs}
            loading={loading}
            emptyMessage="No runs yet."
            rowKey={(r) => r.id}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submitRun}
        title="Run destructive scenario?"
        message={`This is a destructive_test run. It may mutate real platform state. Only proceed if you have SCENARIO_RUNNER_ALLOW_DESTRUCTIVE=true set in the target environment and understand the consequences.`}
        confirmLabel="Run destructive"
        destructive
      />
    </AppLayout>
  );
}
