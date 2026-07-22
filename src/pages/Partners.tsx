import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatAmount, formatDateTime } from "@/lib/utils";
import { partnerService, CreatePartnerPayload } from "@/services/partnerService";
import type { Partner, Transaction } from "@/types";

type Action = "create" | "muxed" | "rate" | "transactions" | null;

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [active, setActive] = useState<Partner | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [txsLoading, setTxsLoading] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => Promise<void> }>(
    null
  );

  const [createForm, setCreateForm] = useState<CreatePartnerPayload>({
    name: "",
    type: "LEH",
    contactEmail: "",
    contactPhone: "",
  });
  const [muxedForm, setMuxedForm] = useState({ muxedAccount: "" });
  const [rateForm, setRateForm] = useState({ rate: 0, notes: "" });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setPartners(await partnerService.list());
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function open(act: Exclude<Action, null | "create">, partner: Partner) {
    setActive(partner);
    setAction(act);
    if (act === "muxed") setMuxedForm({ muxedAccount: partner.muxedAccount || "" });
    if (act === "rate") setRateForm({ rate: partner.rate ?? 0, notes: "" });
    if (act === "transactions") {
      setTxsLoading(true);
      partnerService
        .transactions(partner.id)
        .then(setTxs)
        .catch(() => setTxs([]))
        .finally(() => setTxsLoading(false));
    }
  }

  return (
    <AppLayout title="Partners / LEH / Corporations" subtitle="MUXED accounts and Kiwoo-controlled rates">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Partners</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={refresh}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAction("create")}>
              + New partner
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={partners}
            loading={loading}
            rowKey={(r) => r.id}
            columns={[
              { key: "name", header: "Name" },
              { key: "type", header: "Type", render: (r) => <StatusBadge status={r.type} /> },
              { key: "muxedAccount", header: "MUXED", render: (r) => r.muxedAccount || "—" },
              {
                key: "rate",
                header: "Rate",
                className: "text-right",
                render: (r) => (r.rate != null ? r.rate.toFixed(4) : "—"),
              },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "actions",
                header: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => open("muxed", r)}>
                      MUXED
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => open("rate", r)}>
                      Rate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => open("transactions", r)}>
                      Tx
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={action === "create"}
        onClose={() => setAction(null)}
        title="Create partner"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                setConfirm({
                  title: "Create partner",
                  message: `Create partner ${createForm.name}?`,
                  run: async () => {
                    await partnerService.create(createForm);
                    setConfirm(null);
                    setAction(null);
                    setCreateForm({ name: "", type: "LEH", contactEmail: "", contactPhone: "" });
                    await refresh();
                  },
                })
              }
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput
            label="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <FormSelect
            label="Type"
            value={createForm.type}
            onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
          >
            <option value="LEH">LEH</option>
            <option value="CORPORATION">Corporation</option>
            <option value="PARTNER">Partner</option>
          </FormSelect>
          <FormInput
            label="Contact email"
            type="email"
            value={createForm.contactEmail || ""}
            onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
          />
          <FormInput
            label="Contact phone"
            value={createForm.contactPhone || ""}
            onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={action === "muxed"}
        onClose={() => setAction(null)}
        title={active ? `MUXED account — ${active.name}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                active &&
                setConfirm({
                  title: "Assign MUXED",
                  message: `Assign MUXED ${muxedForm.muxedAccount} to ${active.name}?`,
                  run: async () => {
                    await partnerService.assignMuxed({
                      partnerId: active.id,
                      muxedAccount: muxedForm.muxedAccount,
                    });
                    setConfirm(null);
                    setAction(null);
                    await refresh();
                  },
                })
              }
            >
              Assign
            </Button>
          </>
        }
      >
        <FormInput
          label="MUXED account"
          placeholder="M…"
          value={muxedForm.muxedAccount}
          onChange={(e) => setMuxedForm({ muxedAccount: e.target.value })}
        />
      </Modal>

      <Modal
        open={action === "rate"}
        onClose={() => setAction(null)}
        title={active ? `Set transaction rate — ${active.name}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                active &&
                setConfirm({
                  title: "Update rate",
                  message: `Set rate to ${rateForm.rate} for ${active.name}? This will affect new transactions.`,
                  run: async () => {
                    await partnerService.setRate({
                      partnerId: active.id,
                      rate: rateForm.rate,
                      notes: rateForm.notes,
                    });
                    setConfirm(null);
                    setAction(null);
                    await refresh();
                  },
                })
              }
            >
              Save rate
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput
            label="Rate (Kiwoo-controlled)"
            type="number"
            step="0.0001"
            value={rateForm.rate}
            onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })}
          />
          <FormTextarea
            label="Notes"
            value={rateForm.notes}
            onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={action === "transactions"}
        onClose={() => setAction(null)}
        title={active ? `Transactions — ${active.name}` : ""}
        size="lg"
      >
        <DataTable
          rows={txs}
          loading={txsLoading}
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
