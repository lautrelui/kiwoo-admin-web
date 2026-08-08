import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { treasuryService } from "@/services/treasuryService";
import { ledgerService } from "@/services/ledgerService";
import { kycService } from "@/services/kycService";
import { formatAmount } from "@/lib/utils";
import type { AmlFlag, JournalSummary, TreasuryStatus } from "@/types";

/// Kiwoo is a ledger-first system: every money movement is a
/// `JournalEntry` posted via `LedgerService.post()`. This dashboard
/// derives its charts from `/ledger/journals` (last 30 days) instead
/// of the legacy `Transactions` model, which is dead in prod (see the
/// Transactions page for the same rewrite).
export default function Dashboard() {
  const [treasury, setTreasury] = useState<TreasuryStatus | null>(null);
  const [journals, setJournals] = useState<JournalSummary[]>([]);
  const [flags, setFlags] = useState<AmlFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Last 30 days of activity. `take: 500` is generous — real prod
      // volume per day is small; if the ledger grows, this becomes the
      // right place to add a time-bucketed aggregation endpoint on the
      // backend instead of shipping every row to the browser.
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const results = await Promise.allSettled([
        treasuryService.status(),
        ledgerService.listJournals({ from: from.toISOString(), take: 500 }),
        kycService.amlFlags(),
      ]);
      if (!mounted) return;
      if (results[0].status === "fulfilled") setTreasury(results[0].value);
      if (results[1].status === "fulfilled")
        setJournals(
          Array.isArray(results[1].value?.data) ? results[1].value.data : [],
        );
      if (results[2].status === "fulfilled")
        setFlags(Array.isArray(results[2].value) ? results[2].value : []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const volumeSeries = useMemo(() => aggregateDaily(journals), [journals]);
  const sourceBreakdown = useMemo(() => countBySource(journals), [journals]);
  const dominantCurrency = useMemo(() => currencyLabel(journals), [journals]);

  return (
    <AppLayout
      title="Overview"
      subtitle="Real-time view of treasury, ledger activity, and compliance"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Circulating supply"
          value={
            loading
              ? "…"
              : formatAmount(
                  treasury?.circulatingSupply,
                  treasury?.assetCode || "HTGe",
                )
          }
          icon={<span className="text-lg">₿</span>}
        />
        <StatCard
          label="Reserve balance"
          value={
            loading ? "…" : formatAmount(treasury?.reserveBalance, "HTG")
          }
          icon={<span className="text-lg">▣</span>}
        />
        <StatCard
          label="Backing ratio"
          value={
            loading
              ? "…"
              : treasury?.backingRatio
                ? `${(treasury.backingRatio * 100).toFixed(1)}%`
                : "—"
          }
          icon={<span className="text-lg">∝</span>}
        />
        <StatCard
          label="Open AML flags"
          value={loading ? "…" : flags.length}
          trend={flags.length > 0 ? "down" : "flat"}
          delta={flags.length > 0 ? "Needs review" : "All clear"}
          icon={<span className="text-lg">⚑</span>}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Ledger volume (last 30 days)"
          subtitle={`Daily net amount ${dominantCurrency} · ${journals.length} journals`}
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volumeSeries}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1cb464" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1cb464" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#11924f"
                fill="url(#vol)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="By source"
          subtitle="Journals by source_type"
        >
          {/* Horizontal bars (sorted desc) read far better than a pie for the
              ~18 source_type categories — thin pie slices + a wrapping legend
              overlapped the chart. Scrolls within the card when there are many. */}
          <div className="h-full overflow-y-auto pr-1">
            <div
              style={{ height: Math.max(240, sourceBreakdown.length * 26) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sourceBreakdown}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={168}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>
      </div>
    </AppLayout>
  );
}

const PIE_COLORS = [
  "#1cb464",
  "#11924f",
  "#7be3a3",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
];

function aggregateDaily(js: JournalSummary[]) {
  const map = new Map<string, number>();
  for (const j of js) {
    const day = (j.created_at || "").slice(0, 10) || "—";
    const amt = Number(j.net_amount) || 0;
    map.set(day, (map.get(day) || 0) + amt);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, total]) => ({ day, total }));
}

function countBySource(js: JournalSummary[]) {
  const map = new Map<string, number>();
  for (const j of js) {
    const k = j.source_type || "unknown";
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));
}

/// Most-common currency across the journals, in parens for the chart
/// subtitle — makes it obvious when the ledger has mixed currencies.
function currencyLabel(js: JournalSummary[]) {
  const map = new Map<string, number>();
  for (const j of js) {
    if (!j.currency) continue;
    map.set(j.currency, (map.get(j.currency) || 0) + 1);
  }
  if (map.size === 0) return "";
  const dominant = Array.from(map.entries()).sort(
    ([, a], [, b]) => b - a,
  )[0][0];
  return `(${dominant})`;
}
