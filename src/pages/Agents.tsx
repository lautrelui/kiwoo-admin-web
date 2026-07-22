import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatAmount, formatDateTime } from "@/lib/utils";
import { agentService } from "@/services/agentService";
import type { Agent, Transaction } from "@/types";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [activity, setActivity] = useState<Transaction[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => Promise<void> }>(
    null
  );
  const [commissionForm, setCommissionForm] = useState({ cashIn: 0, cashOut: 0 });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setAgents(await agentService.list());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function openAgent(agent: Agent) {
    setSelected(agent);
    setCommissionForm({
      cashIn: agent.cashInCommission ?? 0,
      cashOut: agent.cashOutCommission ?? 0,
    });
    setActivityLoading(true);
    try {
      setActivity(await agentService.cashActivity(agent.id));
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <AppLayout title="Agents" subtitle="Cash-in / cash-out network">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Agents directory</CardTitle>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={agents}
            loading={loading}
            rowKey={(r) => r.id}
            onRowClick={openAgent}
            columns={[
              { key: "name", header: "Name" },
              { key: "phone", header: "Phone" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "liquidity",
                header: "Liquidity",
                className: "text-right",
                render: (r) => formatAmount(r.liquidity),
              },
              {
                key: "cashInCommission",
                header: "Cash-in %",
                className: "text-right",
                render: (r) => (r.cashInCommission != null ? `${r.cashInCommission}%` : "—"),
              },
              {
                key: "cashOutCommission",
                header: "Cash-out %",
                className: "text-right",
                render: (r) => (r.cashOutCommission != null ? `${r.cashOutCommission}%` : "—"),
              },
              { key: "rating", header: "Rating", render: (r) => (r.rating != null ? r.rating.toFixed(1) : "—") },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) => (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirm({
                        title: "Approve agent",
                        message: `Approve ${r.name}?`,
                        run: async () => {
                          await agentService.approve({ agentId: r.id });
                          setConfirm(null);
                          await refresh();
                        },
                      });
                    }}
                  >
                    Approve
                  </Button>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Agent — ${selected.name}` : ""}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              onClick={() =>
                selected &&
                setConfirm({
                  title: "Update commissions",
                  message: `Set commissions to ${commissionForm.cashIn}% / ${commissionForm.cashOut}%?`,
                  run: async () => {
                    await agentService.updateCommission({
                      agentId: selected.id,
                      cashInCommission: commissionForm.cashIn,
                      cashOutCommission: commissionForm.cashOut,
                    });
                    setConfirm(null);
                    setSelected(null);
                    await refresh();
                  },
                })
              }
            >
              Save commissions
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Cash-in commission %"
                type="number"
                value={commissionForm.cashIn}
                onChange={(e) =>
                  setCommissionForm({ ...commissionForm, cashIn: Number(e.target.value) })
                }
              />
              <FormInput
                label="Cash-out commission %"
                type="number"
                value={commissionForm.cashOut}
                onChange={(e) =>
                  setCommissionForm({ ...commissionForm, cashOut: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-ink-700">Recent activity</h4>
              <DataTable
                rows={activity}
                loading={activityLoading}
                rowKey={(r) => r.id}
                emptyMessage="No activity"
                columns={[
                  { key: "reference", header: "Reference", render: (r) => r.reference || `#${r.id}` },
                  { key: "type", header: "Type" },
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
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
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
