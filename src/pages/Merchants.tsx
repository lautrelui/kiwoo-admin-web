import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatAmount, formatDateTime } from "@/lib/utils";
import { merchantService } from "@/services/merchantService";
import type { Merchant, Transaction } from "@/types";

interface DetailState {
  merchant: Merchant;
  transactions: Transaction[];
  qrRequests: unknown;
  settlement: unknown;
  loading: boolean;
}

export default function Merchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setMerchants(await merchantService.list());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function openMerchant(merchant: Merchant) {
    setDetail({ merchant, transactions: [], qrRequests: null, settlement: null, loading: true });
    const [t, q, s] = await Promise.allSettled([
      merchantService.transactions(merchant.id),
      merchantService.qrPaymentRequests(merchant.id),
      merchantService.settlementStatus(merchant.id),
    ]);
    setDetail({
      merchant,
      transactions: t.status === "fulfilled" ? t.value : [],
      qrRequests: q.status === "fulfilled" ? q.value : null,
      settlement: s.status === "fulfilled" ? s.value : null,
      loading: false,
    });
  }

  return (
    <AppLayout title="Merchants" subtitle="Merchant payments, QR requests and settlement">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Merchants directory</CardTitle>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={merchants}
            loading={loading}
            rowKey={(r) => r.id}
            onRowClick={openMerchant}
            columns={[
              { key: "businessName", header: "Business" },
              { key: "ownerName", header: "Owner" },
              { key: "phone", header: "Phone" },
              { key: "category", header: "Category" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "totalSales",
                header: "Total sales",
                className: "text-right",
                render: (r) => formatAmount(r.totalSales),
              },
              {
                key: "settlementBalance",
                header: "Pending settlement",
                className: "text-right",
                render: (r) => formatAmount(r.settlementBalance),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Merchant — ${detail.merchant.businessName}` : ""}
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-ink-400">Owner</div>
                <div>{detail.merchant.ownerName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-400">Phone</div>
                <div>{detail.merchant.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-400">Status</div>
                <StatusBadge status={detail.merchant.status} />
              </div>
              <div>
                <div className="text-xs text-ink-400">Settlement balance</div>
                <div>{formatAmount(detail.merchant.settlementBalance)}</div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-700">Transactions</h4>
              <DataTable
                rows={detail.transactions}
                loading={detail.loading}
                rowKey={(r) => r.id}
                emptyMessage="No transactions"
                columns={[
                  { key: "reference", header: "Reference", render: (r) => r.reference || `#${r.id}` },
                  {
                    key: "amount",
                    header: "Amount",
                    className: "text-right",
                    render: (r) => formatAmount(r.amount, r.assetCode),
                  },
                  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                  { key: "createdAt", header: "When", render: (r) => formatDateTime(r.createdAt) },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>QR payment requests</CardTitle>
                </CardHeader>
                <CardBody>
                  <pre className="max-h-48 overflow-auto rounded bg-ink-50 p-2 text-xs">
                    {JSON.stringify(detail.qrRequests ?? "—", null, 2)}
                  </pre>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Settlement status</CardTitle>
                </CardHeader>
                <CardBody>
                  <pre className="max-h-48 overflow-auto rounded bg-ink-50 p-2 text-xs">
                    {JSON.stringify(detail.settlement ?? "—", null, 2)}
                  </pre>
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
