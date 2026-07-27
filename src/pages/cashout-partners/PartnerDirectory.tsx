import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput } from "@/components/ui/FormInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cashoutPartnerService as svc } from "@/services/cashoutPartnerService";
import type { PartnerDirectoryItem } from "@/types/cashoutPartner";

export default function PartnerDirectory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PartnerDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try { setRows((await svc.listPartners({ search: search || undefined })).items ?? []); }
    catch (err) { setError(apiErrorMessage(err)); }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout title="Cash-out Partners" subtitle="Provisioned, active and suspended partners">
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Card>
        <CardHeader className="flex items-end justify-between gap-3">
          <CardTitle>Partner directory</CardTitle>
          <div className="flex items-end gap-2">
            <FormInput label="Search" placeholder="Name, phone, wallet, city…" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()} className="w-56" />
            <Button variant="secondary" size="sm" onClick={refresh}>Search</Button>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            emptyMessage="No partners yet"
            onRowClick={(r) => navigate(`/cashout-partners/directory/${r.id}`)}
            columns={[
              { key: "name", header: "Name", render: (r) => r.display_name || r.user.name || `User #${r.user_id}` },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "availability", header: "Availability", render: (r) => <StatusBadge status={r.availability} /> },
              { key: "capacity", header: "Capacity", render: (r) => (r.typical_cash_available ? `${r.typical_cash_available} HTG` : "—") },
              { key: "area", header: "Operating area", render: (r) => [r.neighborhood, r.operating_city].filter(Boolean).join(", ") || "—" },
              { key: "last", header: "Last active", render: (r) => formatDateTime(r.activated_at || r.updated_at) },
              { key: "trust", header: "Trust", render: (r) => r.compliance.trust_band || "—" },
              { key: "cur", header: "Current", render: (r) => r.stats.current_requests },
              { key: "done", header: "Completed", render: (r) => r.stats.completed_requests },
            ]}
          />
        </CardBody>
      </Card>
    </AppLayout>
  );
}
