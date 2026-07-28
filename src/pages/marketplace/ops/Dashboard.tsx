import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { FeatureGate, OfflineBanner, ParticipantPage, TestNotice } from "@/components/marketplace/atoms";
import { formatMoney } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import {
  FUNNEL_STEPS,
  TREND_BUCKETS,
  TREND_METRICS,
  alertSeverity,
  durationMs,
  fmtInt,
  funnelRows,
  isLowLiquidity,
  severityTone,
  slaRows,
} from "@/lib/marketplaceOps";
import { marketplaceOpsService as svc } from "@/services/marketplaceOpsService";
import type { OpsAlert, OpsParticipant, OpsSearchRow, OpsTimelineItem } from "@/types/marketplaceOps";
import { cn } from "@/lib/utils";

// M4A-4 · Marketplace Operations Dashboard ("Control Tower"). READ-ONLY, operator-only. Loads the
// summary first; every other widget loads independently (async). Dark-safe: zero Marketplace rows
// render an intentional empty dashboard (no NaN, no divide-by-zero). Backend is authoritative — no
// client recomputation. Cards/rows drill down into the operator console.

const TONE_TEXT: Record<string, string> = { good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600", info: "text-sky-600", muted: "text-ink-400" };

export default function OpsDashboard() {
  const online = useOnline();
  const sum = useAsyncResource(() => svc.summary(), []);
  useLifecycleRefresh(sum.reload);
  const s = sum.data;

  return (
    <ParticipantPage
      title="Marketplace Control Tower"
      subtitle="Operations command center — is Marketplace healthy, where is it stuck, who needs attention, is intervention required?"
      actions={<Button variant="secondary" size="sm" onClick={sum.reload} disabled={sum.loading}>Refresh</Button>}
    >
      <OfflineBanner online={online} />
      <TestNotice notice={"TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED"} className="mb-4" />

      <FeatureGate availability={sum.availability} code={sum.error?.code} onRetry={sum.reload}>
        {sum.loading && !s ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading summary…</Card>
        ) : (
          <div className="space-y-6">
            {/* 1 · Overview KPIs */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Kpi label="Active participants" value={fmtInt(s?.active_participants ?? 0)} />
              <Kpi label="Active positions" value={fmtInt(s?.active_offers ?? 0)} />
              <Kpi label="Declared liquidity" value={formatMoney(s?.declared_capacity, "HTG")} />
              <Kpi label="Available capacity" value={formatMoney(s?.available_liquidity, "HTG")} />
              <Kpi label="Locked liquidity" value={formatMoney(s?.locked_capacity, "HTG")} />
              <Kpi label="Fulfilled liquidity" value={formatMoney(s?.fulfilled_capacity, "HTG")} />
              <Kpi label="Pending acceptance" value={fmtInt(s?.pending_participant_acceptances ?? 0)} to="/operator/marketplace" />
              <Kpi label="Ready for collection" value={fmtInt(s?.ready_for_collection ?? 0)} />
              <Kpi label="Awaiting customer" value={fmtInt(s?.awaiting_customer_confirmation ?? 0)} />
              <Kpi label="Manual reviews" value={fmtInt(s?.manual_review_cases ?? 0)} to="/operator/marketplace" />
              <Kpi label="Open disputes" value={fmtInt(s?.open_disputes ?? 0)} to="/operator/marketplace/disputes" />
              <Kpi label="Pending compensations" value={fmtInt(s?.pending_compensations ?? 0)} />
              <Kpi label="Completed today" value={fmtInt(s?.completed_settlements_today ?? 0)} />
              <Kpi label="Open manual reviews" value={fmtInt(s?.manual_review_cases ?? 0)} to="/operator/marketplace" />
              <Kpi label="Active alerts" value={fmtInt(s?.active_alerts ?? 0)} tone={(s?.active_alerts ?? 0) > 0 ? "bad" : "good"} />
              <Kpi label="Completed (all time)" value={fmtInt(s?.completed_settlements ?? 0)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Funnel />
              <Trends />
              <Liquidity />
              <Sla />
              <Alerts />
              <RealtimeTimeline />
            </div>

            <ParticipantHealth />
            <Search />
          </div>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}

function Kpi({ label, value, to, tone }: { label: string; value: ReactNode; to?: string; tone?: string }) {
  const card = <StatCard label={label} value={<span className={tone ? TONE_TEXT[tone] : undefined}>{value}</span>} />;
  return to ? <Link to={to} className="block transition-transform hover:-translate-y-0.5">{card}</Link> : card;
}

function Widget({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

// 2 · Funnel
function Funnel() {
  const res = useAsyncResource(() => svc.funnel(), []);
  const rows = res.data ? funnelRows(res.data) : [];
  const empty = rows.every((r) => r.count === 0);
  return (
    <Widget title="Operational funnel">
      {res.loading ? <Skel /> : empty ? <Empty text="No Marketplace flow yet." /> : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" hide />
                <YAxis width={28} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-ink-600">{r.label}</span>
                <span className="text-ink-800">{fmtInt(r.count)}{r.conversionPct != null && <span className="text-ink-400"> · {r.conversionPct}%</span>}{r.dropPct != null && r.dropPct > 0 && <span className="text-red-500"> · −{r.dropPct}%</span>}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Widget>
  );
}

// 3 · Liquidity
function Liquidity() {
  const res = useAsyncResource(() => svc.liquidity(), []);
  const d = res.data;
  return (
    <Widget title="Liquidity">
      {res.loading ? <Skel /> : !d || d.by_service_area.length === 0 ? <Empty text="No liquidity declared." /> : (
        <>
          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
            <KV k="Declared" v={formatMoney(d.total.declared, "HTG")} />
            <KV k="Available" v={formatMoney(d.total.available, "HTG")} />
            <KV k="Locked" v={formatMoney(d.total.locked, "HTG")} />
            <KV k="Fulfilled" v={formatMoney(d.total.fulfilled, "HTG")} />
          </div>
          <div className="text-xs font-semibold text-ink-600">By service area</div>
          <DataTable
            columns={[
              { key: "area", header: "Area", render: (a: typeof d.by_service_area[number]) => <span className={cn(isLowLiquidity(a.available) && "text-red-600 font-medium")}>{a.service_area}{isLowLiquidity(a.available) && " · low"}</span> },
              { key: "avail", header: "Available", render: (a: typeof d.by_service_area[number]) => formatMoney(a.available, "HTG") },
              { key: "locked", header: "Locked", render: (a: typeof d.by_service_area[number]) => formatMoney(a.locked, "HTG") },
              { key: "positions", header: "Positions", render: (a: typeof d.by_service_area[number]) => a.positions },
            ]}
            rows={d.by_service_area}
            rowKey={(a) => a.service_area}
            emptyMessage="—"
          />
        </>
      )}
    </Widget>
  );
}

// 4 · Participant health
function ParticipantHealth() {
  const [page, setPage] = useState(1);
  const res = useAsyncResource(() => svc.participants(page, 25), [page]);
  const d = res.data;
  return (
    <Widget title="Participant health" action={
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
        <Button size="sm" variant="ghost" disabled={!d || page * 25 >= d.total} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    }>
      <DataTable
        columns={[
          { key: "id", header: "Participant", render: (p: OpsParticipant) => <span className="font-medium">#{p.participant_id}</span> },
          { key: "avail", header: "Available", render: (p: OpsParticipant) => formatMoney(p.available_capacity, "HTG") },
          { key: "obl", header: "Active", render: (p: OpsParticipant) => p.pending_obligations + p.accepted },
          { key: "acc", header: "Accepted", render: (p: OpsParticipant) => p.accepted },
          { key: "rej", header: "Rejected", render: (p: OpsParticipant) => p.rejected },
          { key: "to", header: "Timeouts", render: (p: OpsParticipant) => p.timed_out },
          { key: "disp", header: "Disputes", render: (p: OpsParticipant) => p.disputed },
          { key: "settled", header: "Settled", render: (p: OpsParticipant) => p.settled },
        ]}
        rows={d?.items ?? []}
        loading={res.loading}
        emptyMessage="No participants yet."
        rowKey={(p) => p.participant_id}
      />
      {d && <div className="mt-2 text-xs text-ink-400">{d.total} participant(s)</div>}
    </Widget>
  );
}

// 5 · SLA
function Sla() {
  const res = useAsyncResource(() => svc.sla(), []);
  const rows = res.data ? slaRows(res.data) : [];
  return (
    <Widget title="SLA">
      {res.loading ? <Skel /> : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-ink-50 py-1 text-sm last:border-0">
              <span className="text-ink-600">{r.label}</span>
              <span className="flex items-center gap-2">
                <span className={TONE_TEXT[r.tone]}>{r.status}</span>
                <span className="text-ink-800">{r.unit === "age" ? durationMs(r.value) : fmtInt(r.value)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

// 6 · Alerts
function Alerts() {
  const res = useAsyncResource(() => svc.alerts(1, 25), []);
  const items = res.data?.items ?? [];
  return (
    <Widget title="Alerts">
      {res.loading ? <Skel /> : items.length === 0 ? <Empty text="No active alerts. All clear." /> : (
        <ul className="space-y-2">
          {items.slice(0, 8).map((a: OpsAlert, i) => {
            const sev = alertSeverity(a);
            return (
              <li key={i} className="rounded border border-ink-100 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className={cn("font-medium", TONE_TEXT[severityTone(sev)])}>{sev.toUpperCase()} · {a.reason_code}</span>
                  <span className="text-ink-400">{durationMs(a.age_ms)}</span>
                </div>
                <div className="text-ink-600">{a.recommended_action}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
                  <span>{a.deterministic_repair_available ? "deterministic repair" : "no auto-repair"}</span>
                  <span>·</span>
                  <span>{a.human_review_required ? "human review" : "no review needed"}</span>
                  <Link className="ml-auto text-brand-600" to={`/operator/marketplace/case/${encodeURIComponent(a.reference)}`}>Open case</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

// 7 · Realtime timeline
function RealtimeTimeline() {
  const res = useAsyncResource(() => svc.timeline(40), []);
  const items = res.data ?? [];
  return (
    <Widget title="Realtime timeline">
      {res.loading ? <Skel /> : items.length === 0 ? <Empty text="No recent events." /> : (
        <ol className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((e: OpsTimelineItem, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="w-36 shrink-0 text-ink-400">{new Date(e.at).toLocaleString()}</span>
              <span className="text-ink-700">{e.event} · {e.actor_type}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-300">{e.reference}</span>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  );
}

// 9 · Trends
function Trends() {
  const [metric, setMetric] = useState("quotes");
  const [bucket, setBucket] = useState("day");
  const res = useAsyncResource(() => svc.trends(metric, bucket, 30), [metric, bucket]);
  const data = (res.data ?? []).map((p) => ({ t: p.bucket_start.slice(0, 10), count: p.count }));
  return (
    <Widget title="Historical trends" action={
      <div className="flex gap-1">
        <select className="rounded border border-ink-200 px-1 py-0.5 text-xs" value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Trend metric">
          {TREND_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select className="rounded border border-ink-200 px-1 py-0.5 text-xs" value={bucket} onChange={(e) => setBucket(e.target.value)} aria-label="Trend bucket">
          {TREND_BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </div>
    }>
      {res.loading ? <Skel /> : data.length === 0 ? <Empty text="No history in this window." /> : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} />
              <YAxis width={28} tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Widget>
  );
}

// Search
function Search() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [submitted, setSubmitted] = useState<{ q: string; state: string } | null>(null);
  const res = useAsyncResource(() => (submitted ? svc.search({ q: submitted.q || undefined, state: submitted.state || undefined, limit: 25 }) : Promise.resolve({ items: [], total: 0, limit: 25 })), [submitted]);
  return (
    <Widget title="Search">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-56"><FormInput label="Reference / query" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="MFL-… / OPmt-…" /></div>
        <div className="w-56"><FormSelect label="State" name="search_state" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Any</option>
          {["MANUAL_REVIEW_REQUIRED", "CUSTOMER_RECEIPT_PENDING", "SETTLED", "COMPENSATED", "READY_FOR_COLLECTION"].map((st) => <option key={st} value={st}>{st}</option>)}
        </FormSelect></div>
        <Button size="sm" onClick={() => setSubmitted({ q, state })}>Search</Button>
      </div>
      {submitted && (
        <DataTable
          columns={[
            { key: "ref", header: "Case", render: (r: OpsSearchRow) => <Link className="font-mono text-xs text-brand-600" to={`/operator/marketplace/case/${encodeURIComponent(r.fulfilment_ref)}`}>{r.fulfilment_ref}</Link> },
            { key: "state", header: "State", render: (r: OpsSearchRow) => r.state },
            { key: "amount", header: "Amount", render: (r: OpsSearchRow) => formatMoney(r.amount, r.currency) },
            { key: "area", header: "Area", render: (r: OpsSearchRow) => r.service_area ?? "—" },
            { key: "participant", header: "Participant", render: (r: OpsSearchRow) => `#${r.participant_id}` },
          ]}
          rows={res.data?.items ?? []}
          loading={res.loading}
          emptyMessage="No matches."
          rowKey={(r) => r.fulfilment_ref}
        />
      )}
    </Widget>
  );
}

// small helpers
function KV({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between rounded bg-ink-50 px-2 py-1"><span className="text-ink-500">{k}</span><span className="font-medium text-ink-800">{v}</span></div>;
}
function Skel() { return <div className="h-24 animate-pulse rounded bg-ink-50" />; }
function Empty({ text }: { text: string }) { return <p className="py-6 text-center text-sm text-ink-400">{text}</p>; }
