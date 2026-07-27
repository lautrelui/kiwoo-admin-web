import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cashoutPartnerService as svc } from "@/services/cashoutPartnerService";
import type { PartnerApplication, PartnerDashboard, PartnerStatus } from "@/types/cashoutPartner";

const STATUS_OPTIONS: (PartnerStatus | "")[] = [
  "", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "INFORMATION_REQUIRED", "APPROVED",
  "PARTICIPANT_PROVISIONED", "MARKETPLACE_ACTIVE", "REJECTED", "SUSPENDED", "INACTIVE",
];

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

export default function PartnerApplications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [kpi, setKpi] = useState<PartnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [from, setFrom] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    const [list, dash] = await Promise.allSettled([
      svc.listApplications({ status: status || undefined, search: search || undefined, city: city || undefined, from: from || undefined }),
      svc.dashboard(),
    ]);
    if (list.status === "fulfilled") setRows(list.value.items ?? []);
    else setError(apiErrorMessage(list.reason));
    if (dash.status === "fulfilled") setKpi(dash.value);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [status]);

  return (
    <AppLayout title="Cash-out Partner Applications" subtitle="Review and decide partner applications">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending review" value={kpi?.applications_pending ?? "—"} />
        <StatCard label="Submitted today" value={kpi?.applications_today ?? "—"} />
        <StatCard label="Avg approval time" value={fmtDuration(kpi?.avg_approval_seconds ?? null)} />
        <StatCard label="Eligible partners" value={kpi?.eligible_partners ?? "—"} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-end justify-between gap-3">
          <CardTitle>Application queue</CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <FormSelect name="status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
              {STATUS_OPTIONS.map((s) => (
                <option key={s || "ALL"} value={s}>{s || "All statuses"}</option>
              ))}
            </FormSelect>
            <FormInput label="Search" placeholder="Name, phone, wallet, city…" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} className="w-56" />
            <FormInput label="City" placeholder="City" value={city}
              onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} className="w-36" />
            <FormInput label="Submitted from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <Button variant="secondary" size="sm" onClick={refresh}>Apply</Button>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyMessage="No applications match these filters"
            onRowClick={(r) => navigate(`/cashout-partners/applications/${r.id}`)}
            columns={[
              {
                key: "applicant", header: "Applicant",
                render: (r) => (
                  <div>
                    <div className="font-medium text-ink-900">{r.display_name || r.user.name || `User #${r.user_id}`}</div>
                    <div className="text-xs text-ink-400">{r.user.wallet_id ? `${r.user.wallet_id.slice(0, 8)}…` : `#${r.user_id}`}</div>
                  </div>
                ),
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "kyc", header: "KYC", render: (r) => <span className="text-xs">{r.compliance.kyc_tier || "—"}</span> },
              { key: "trust", header: "Trust", render: (r) => r.compliance.trust_band || "—" },
              { key: "city", header: "City", render: (r) => r.operating_city || "—" },
              { key: "submitted", header: "Submitted", render: (r) => (r.submitted_at ? formatDateTime(r.submitted_at) : "—") },
              { key: "updated", header: "Last updated", render: (r) => formatDateTime(r.updated_at) },
              { key: "reviewer", header: "Reviewer", render: (r) => (r.assigned_reviewer ? `#${r.assigned_reviewer}` : "—") },
              {
                key: "actions", header: "", className: "text-right",
                render: (r) => (
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/cashout-partners/applications/${r.id}`); }}>
                    Review
                  </Button>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>
    </AppLayout>
  );
}
