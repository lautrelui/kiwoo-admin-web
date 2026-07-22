import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { PayloadViewer } from "@/components/ops/PayloadViewer";
import {
  FilterBar,
  FilterField,
  FilterInput,
  FilterSelect,
} from "@/components/ops/FilterBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChartCard } from "@/components/ui/ChartCard";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { intelligenceService } from "@/services/intelligenceService";
import type {
  AnalyticsMetric,
  AnalyticsOverviewSlice,
  AnalyticsTimeseriesResponse,
  AnalyticsPeriod,
} from "@/types/intelligence";

/**
 * Analytics Page — Sprint 13 Task 130.5.
 *
 * Reads the 4 admin endpoints Task 130 shipped:
 *   /admin/intelligence/analytics/overview
 *   /admin/intelligence/analytics/metrics
 *   /admin/intelligence/analytics/products
 *   /admin/intelligence/analytics/timeseries
 *
 * Layout is scoped for the review brief:
 *   1. Overview cards       (8 P1 metric totals)
 *   2. Product breakdown    (per-product totals table)
 *   3. Timeseries chart     (recharts line chart)
 *   4. Metric Explorer      (filter + paginated table)
 *   5. Explanation panel    (what these metrics mean + guarantees)
 *
 * Zero user PII surfaces here — analytics rows carry aggregate
 * counters keyed by (metric_key, product, period, dimensions_hash).
 */

const OVERVIEW_METRICS: Array<{ key: string; label: string; format?: "sum" | "count" }> = [
  { key: "events.count", label: "Total Events", format: "count" },
  { key: "notifications.created", label: "Notifications", format: "count" },
  { key: "activity.created", label: "Activity", format: "count" },
  { key: "knowledge.facts.created", label: "Knowledge Facts", format: "count" },
  { key: "rules.evaluations.created", label: "Rule Evaluations", format: "count" },
  { key: "wallet.inflow.total", label: "Wallet Inflow", format: "sum" },
  { key: "wallet.outflow.total", label: "Wallet Outflow", format: "sum" },
  { key: "commerce.receipts.count", label: "Commerce Receipts", format: "count" },
];

const PROXY_METRICS = [
  "events.count",
  "notifications.created",
  "activity.created",
  "knowledge.facts.created",
  "rules.evaluations.created",
];

function toDateInput(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtNumber(v: string | number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n === Math.floor(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function AnalyticsPage() {
  // Window: last 30 days default.
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return toDateInput(d);
  });
  const [to, setTo] = useState<string>(() => toDateInput(new Date()));
  const [productFilter, setProductFilter] = useState<string>("");

  const [overviewSlices, setOverviewSlices] = useState<AnalyticsOverviewSlice[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [topError, setTopError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  // Timeseries selection.
  const [tsMetric, setTsMetric] = useState<string>("events.count");
  const [tsProduct, setTsProduct] = useState<string>("");
  const [ts, setTs] = useState<AnalyticsTimeseriesResponse | null>(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState<unknown>(null);

  // Metric Explorer.
  const [exMetric, setExMetric] = useState<string>("");
  const [exProduct, setExProduct] = useState<string>("");
  const [exPeriod, setExPeriod] = useState<string>("");
  const [exFrom, setExFrom] = useState<string>("");
  const [exTo, setExTo] = useState<string>("");
  const [exCursor, setExCursor] = useState<string | null>(null);
  const [exNextCursor, setExNextCursor] = useState<string | null>(null);
  const [exRows, setExRows] = useState<AnalyticsMetric[]>([]);
  const [exTotal, setExTotal] = useState(0);
  const [exLoading, setExLoading] = useState(false);
  const [exError, setExError] = useState<unknown>(null);

  const loadTop = useCallback(async () => {
    setLoadingTop(true);
    setTopError(null);
    const results = await Promise.allSettled([
      intelligenceService.analyticsOverview({
        from,
        to,
        product: productFilter || undefined,
      }),
      intelligenceService.analyticsProducts(),
    ]);
    if (results[0].status === "fulfilled") {
      setOverviewSlices(
        Array.isArray(results[0].value?.slices) ? results[0].value.slices : [],
      );
    } else {
      setTopError(results[0].reason);
    }
    if (results[1].status === "fulfilled") {
      setProducts(
        Array.isArray(results[1].value?.products) ? results[1].value.products : [],
      );
    }
    setLoadingTop(false);
    setRefreshedAt(new Date());
  }, [from, to, productFilter]);

  const loadTimeseries = useCallback(async () => {
    setTsLoading(true);
    setTsError(null);
    try {
      const data = await intelligenceService.analyticsTimeseries({
        metric_key: tsMetric,
        product: tsProduct || undefined,
        from,
        to,
      });
      setTs(data);
    } catch (e) {
      setTsError(e);
    } finally {
      setTsLoading(false);
    }
  }, [tsMetric, tsProduct, from, to]);

  const loadExplorer = useCallback(
    async (opts: { keepCursor?: boolean } = {}) => {
      setExLoading(true);
      setExError(null);
      try {
        const data = await intelligenceService.analyticsMetrics({
          metric_key: exMetric || undefined,
          product: exProduct || undefined,
          period: (exPeriod as AnalyticsPeriod) || undefined,
          from: exFrom || undefined,
          to: exTo || undefined,
          cursor: opts.keepCursor && exCursor ? exCursor : undefined,
          limit: 50,
        });
        setExRows(Array.isArray(data.metrics) ? data.metrics : []);
        setExTotal(data.total ?? 0);
        setExNextCursor(data.nextCursor ?? null);
      } catch (e) {
        setExError(e);
      } finally {
        setExLoading(false);
      }
    },
    [exMetric, exProduct, exPeriod, exFrom, exTo, exCursor],
  );

  useEffect(() => {
    void loadTop();
  }, [loadTop]);
  useEffect(() => {
    void loadTimeseries();
  }, [loadTimeseries]);
  useEffect(() => {
    void loadExplorer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exMetric, exProduct, exPeriod, exFrom, exTo]);

  const overviewTotals = useMemo(() => {
    const bag = new Map<string, number>();
    for (const s of overviewSlices) {
      const n = Number(s.total);
      if (!Number.isFinite(n)) continue;
      bag.set(s.metric_key, (bag.get(s.metric_key) ?? 0) + n);
    }
    return bag;
  }, [overviewSlices]);

  const productBreakdown = useMemo(() => {
    // Reshape: rows = products, columns = proxy metrics.
    const bag = new Map<string, Record<string, number>>();
    for (const s of overviewSlices) {
      if (!PROXY_METRICS.includes(s.metric_key)) continue;
      const row = bag.get(s.product) ?? {};
      row[s.metric_key] = (row[s.metric_key] ?? 0) + Number(s.total || 0);
      bag.set(s.product, row);
    }
    return Array.from(bag.entries())
      .map(([product, cols]) => ({ product, ...cols }))
      .sort(
        (a, b) =>
          ((b as any)["events.count"] ?? 0) -
          ((a as any)["events.count"] ?? 0),
      );
  }, [overviewSlices]);

  const tsChartData = useMemo(() => {
    if (!ts) return [];
    return ts.points.map((p) => ({
      date: new Date(p.period_start).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: Number(p.value),
    }));
  }, [ts]);

  return (
    <AppLayout>
      <RefreshBar
        title="Analytics"
        subtitle={`Aggregate metrics from PlatformEvents · window ${from} → ${to}`}
        onRefresh={() => {
          void loadTop();
          void loadTimeseries();
          setExCursor(null);
          void loadExplorer();
        }}
        loading={loadingTop || tsLoading || exLoading}
        lastRefreshedAt={refreshedAt}
      />

      <FilterBar className="mt-4">
        <FilterField label="From">
          <FilterInput
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FilterField>
        <FilterField label="To">
          <FilterInput
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FilterField>
        <FilterField label="Product">
          <FilterSelect
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="">Any</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </FilterSelect>
        </FilterField>
      </FilterBar>

      <ErrorNote error={topError} className="mt-4" />

      {/* Section 1 — Overview cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OVERVIEW_METRICS.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={
              overviewTotals.has(m.key)
                ? fmtNumber(overviewTotals.get(m.key)!)
                : loadingTop
                  ? "…"
                  : "0"
            }
          />
        ))}
      </div>

      {/* Section 2 — Product breakdown */}
      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Product breakdown
        </h2>
        <p className="mb-3 text-xs text-ink-500">
          Contract-informed proxies (notifications / activity / knowledge /
          rules) count events whose ProductContract flags them eligible for
          the corresponding downstream projection.
        </p>
        <DataTable
          columns={[
            {
              key: "product",
              header: "Product",
              render: (r) => (
                <Chip tone="info">{(r as any).product}</Chip>
              ),
            },
            {
              key: "events",
              header: "Events",
              render: (r) => (
                <span className="font-mono text-xs">
                  {fmtNumber((r as any)["events.count"] ?? 0)}
                </span>
              ),
            },
            {
              key: "notif",
              header: "Notifications",
              render: (r) => (
                <span className="font-mono text-xs">
                  {fmtNumber((r as any)["notifications.created"] ?? 0)}
                </span>
              ),
            },
            {
              key: "act",
              header: "Activity",
              render: (r) => (
                <span className="font-mono text-xs">
                  {fmtNumber((r as any)["activity.created"] ?? 0)}
                </span>
              ),
            },
            {
              key: "kn",
              header: "Knowledge",
              render: (r) => (
                <span className="font-mono text-xs">
                  {fmtNumber((r as any)["knowledge.facts.created"] ?? 0)}
                </span>
              ),
            },
            {
              key: "rules",
              header: "Rule Evals",
              render: (r) => (
                <span className="font-mono text-xs">
                  {fmtNumber((r as any)["rules.evaluations.created"] ?? 0)}
                </span>
              ),
            },
          ]}
          rows={productBreakdown}
          loading={loadingTop}
          emptyMessage="No products in this window yet."
          rowKey={(r) => (r as any).product}
        />
      </Card>

      {/* Section 3 — Timeseries */}
      <div className="mt-6">
        <ChartCard
          title="Timeseries"
          subtitle={`${tsMetric}${tsProduct ? ` · ${tsProduct}` : ""}`}
          action={
            <div className="flex items-center gap-2">
              <FilterSelect
                value={tsMetric}
                onChange={(e) => setTsMetric(e.target.value)}
              >
                {OVERVIEW_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.key}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                value={tsProduct}
                onChange={(e) => setTsProduct(e.target.value)}
              >
                <option value="">Any product</option>
                {products.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </FilterSelect>
            </div>
          }
        >
          <ErrorNote error={tsError} className="mb-2" />
          {tsChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-400">
              {tsLoading ? "Loading…" : "No data points in this window."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tsChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => fmtNumber(v)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#11924f"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Section 4 — Metric Explorer */}
      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">
          Metric Explorer
        </h2>
        <FilterBar>
          <FilterField label="Metric key">
            <FilterInput
              value={exMetric}
              onChange={(e) => setExMetric(e.target.value)}
              placeholder="events.count"
            />
          </FilterField>
          <FilterField label="Product">
            <FilterSelect
              value={exProduct}
              onChange={(e) => setExProduct(e.target.value)}
            >
              <option value="">Any</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Period">
            <FilterSelect
              value={exPeriod}
              onChange={(e) => setExPeriod(e.target.value)}
            >
              <option value="">Any</option>
              <option value="daily">daily</option>
              <option value="hourly">hourly</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </FilterSelect>
          </FilterField>
          <FilterField label="From">
            <FilterInput
              type="date"
              value={exFrom}
              onChange={(e) => setExFrom(e.target.value)}
            />
          </FilterField>
          <FilterField label="To">
            <FilterInput
              type="date"
              value={exTo}
              onChange={(e) => setExTo(e.target.value)}
            />
          </FilterField>
        </FilterBar>

        <ErrorNote error={exError} className="mt-3" />

        <div className="mt-3">
          <DataTable
            columns={[
              {
                key: "metric_key",
                header: "Metric",
                render: (r) => <Chip tone="brand">{r.metric_key}</Chip>,
              },
              {
                key: "product",
                header: "Product",
                render: (r) => <Chip tone="info">{r.product}</Chip>,
              },
              {
                key: "period_start",
                header: "Period start",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.period_start).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: "value",
                header: "Value",
                render: (r) => (
                  <span className="font-mono text-xs">
                    {fmtNumber(r.value_numeric)}
                  </span>
                ),
              },
              {
                key: "dimensions",
                header: "Dimensions",
                render: (r) =>
                  Object.keys(r.dimensions ?? {}).length === 0 ? (
                    <span className="text-ink-400">—</span>
                  ) : (
                    <div className="max-w-xs">
                      <PayloadViewer value={r.dimensions} maxHeight="6rem" />
                    </div>
                  ),
              },
              {
                key: "updated_at",
                header: "Updated",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.updated_at).toLocaleString()}
                  </span>
                ),
              },
            ]}
            rows={exRows}
            loading={exLoading}
            emptyMessage="No metric rows match those filters."
            rowKey={(r) => r.id}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
          <span>
            {exRows.length} shown of {exTotal.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!exCursor || exLoading}
              onClick={() => {
                setExCursor(null);
                void loadExplorer();
              }}
            >
              ← Reset
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!exNextCursor || exLoading}
              onClick={() => {
                setExCursor(exNextCursor);
                void loadExplorer({ keepCursor: true });
              }}
            >
              Next page →
            </Button>
          </div>
        </div>
      </Card>

      {/* Section 5 — Explanation panel */}
      <Card className="mt-6 border-sky-200 bg-sky-50 p-5">
        <h2 className="text-sm font-semibold text-sky-900">
          What Analytics is (and isn't)
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-sky-900">
          <li>
            <b>Event-derived:</b> every row here is materialised from the
            append-only <code>PlatformEvent</code> ledger. No Product is
            queried directly.
          </li>
          <li>
            <b>Replay-safe:</b> the analytics subscriber writes idempotently
            through <code>AnalyticsProcessedEvent(event_id UNIQUE)</code>
            inside a single transaction; a replayed event contributes zero.
          </li>
          <li>
            <b>No user PII.</b> Aggregate rows carry <code>(metric_key,
            product, period, dimensions_hash)</code>. There is no user id
            column and no free-form payload.
          </li>
          <li>
            <b>No Product-to-Product calls.</b> Contract-informed proxies
            (notifications / activity / knowledge / rules) count events whose
            ProductContract flags them eligible for the corresponding
            downstream projection.
          </li>
          <li>
            <b>No LLM.</b> Task 130.5 is a plain read of the analytics tables.
          </li>
        </ul>
      </Card>
    </AppLayout>
  );
}
