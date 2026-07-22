import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { kycService } from "@/services/kycService";
import type { AmlFlag, KycRecord } from "@/types";

export default function Kyc() {
  const [tab, setTab] = useState<"pending" | "aml">("pending");
  const [pending, setPending] = useState<KycRecord[]>([]);
  const [flags, setFlags] = useState<AmlFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    destructive?: boolean;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    const [p, f] = await Promise.allSettled([kycService.listPending(), kycService.amlFlags()]);
    if (p.status === "fulfilled") setPending(p.value);
    else setError(apiErrorMessage(p.reason));
    if (f.status === "fulfilled") setFlags(f.value);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppLayout title="KYC / AML" subtitle="Review identity documents and compliance flags">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "pending" ? "primary" : "secondary"}
          onClick={() => setTab("pending")}
        >
          Pending KYC ({pending.length})
        </Button>
        <Button
          variant={tab === "aml" ? "primary" : "secondary"}
          onClick={() => setTab("aml")}
        >
          AML Flags ({flags.length})
        </Button>
      </div>

      {tab === "pending" ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Pending KYC submissions</CardTitle>
            <Button variant="secondary" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            <DataTable
              rows={pending}
              loading={loading}
              rowKey={(r) => r.id}
              emptyMessage="No pending KYC"
              columns={[
                { key: "userName", header: "User", render: (r) => r.userName || `#${r.userId}` },
                { key: "phone", header: "Phone" },
                { key: "tier", header: "Target tier", render: (r) => r.tier || "—" },
                {
                  key: "submittedAt",
                  header: "Submitted",
                  render: (r) => formatDateTime(r.submittedAt),
                },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (r) => (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirm({
                            title: "Approve KYC",
                            message: `Approve KYC for ${r.userName || r.userId}?`,
                            run: async () => {
                              await kycService.approve({ userId: r.userId });
                              setConfirm(null);
                              await refresh();
                            },
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setConfirm({
                            title: "Reject KYC",
                            message: `Reject KYC for ${r.userName || r.userId}?`,
                            destructive: true,
                            run: async () => {
                              await kycService.reject({ userId: r.userId });
                              setConfirm(null);
                              await refresh();
                            },
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>AML flags</CardTitle>
            <Button variant="secondary" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            <DataTable
              rows={flags}
              loading={loading}
              rowKey={(r) => r.id}
              emptyMessage="No active AML flags"
              columns={[
                { key: "id", header: "#", render: (r) => `#${r.id}` },
                { key: "userId", header: "User", render: (r) => (r.userId ? `#${r.userId}` : "—") },
                {
                  key: "transactionId",
                  header: "Transaction",
                  render: (r) => (r.transactionId ? `#${r.transactionId}` : "—"),
                },
                { key: "reason", header: "Reason" },
                {
                  key: "severity",
                  header: "Severity",
                  render: (r) => <StatusBadge status={r.severity} />,
                },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                {
                  key: "createdAt",
                  header: "Flagged",
                  render: (r) => formatDateTime(r.createdAt),
                },
              ]}
            />
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        destructive={confirm?.destructive}
        onConfirm={async () => {
          try {
            await confirm?.run();
          } catch (err) {
            setError(apiErrorMessage(err));
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  );
}
