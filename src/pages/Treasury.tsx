import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormInput, FormTextarea } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable } from "@/components/ui/DataTable";
import { apiErrorMessage } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import {
  treasuryService,
  MintPayload,
  BurnPayload,
  FreezePayload,
} from "@/services/treasuryService";
import type { ReserveReport, TreasuryStatus } from "@/types";

type ActionKind = "mint" | "burn" | "freeze" | "unfreeze" | null;

export default function Treasury() {
  const [status, setStatus] = useState<TreasuryStatus | null>(null);
  const [report, setReport] = useState<ReserveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => Promise<void> }>(null);

  const [mintForm, setMintForm] = useState<MintPayload>({ amount: 0, destination: "", memo: "" });
  const [burnForm, setBurnForm] = useState<BurnPayload>({ amount: 0, source: "", memo: "" });
  const [freezeForm, setFreezeForm] = useState<FreezePayload>({ walletAddress: "", reason: "" });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await Promise.allSettled([treasuryService.status(), treasuryService.reserveReport()]);
      if (s.status === "fulfilled") setStatus(s.value);
      if (r.status === "fulfilled") setReport(r.value);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function askConfirm(title: string, message: string, run: () => Promise<void>) {
    setConfirm({ title, message, run });
  }

  return (
    <AppLayout title="Treasury / Stablecoin" subtitle={`Manage ${status?.assetCode || "HTGe"} issuance and reserves`}>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Asset" value={status?.assetCode || "HTGe"} />
        <StatCard
          label="Circulating supply"
          value={loading ? "…" : formatAmount(status?.circulatingSupply, status?.assetCode || "HTGe")}
        />
        <StatCard
          label="Reserve balance"
          value={loading ? "…" : formatAmount(status?.reserveBalance, "HTG")}
        />
        <StatCard
          label="Backing ratio"
          value={
            loading
              ? "…"
              : status?.backingRatio
              ? `${(status.backingRatio * 100).toFixed(2)}%`
              : "—"
          }
        />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Treasury actions</CardTitle>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          <Button onClick={() => setAction("mint")}>Mint</Button>
          <Button variant="danger" onClick={() => setAction("burn")}>
            Burn
          </Button>
          <Button variant="secondary" onClick={() => setAction("freeze")}>
            Freeze wallet
          </Button>
          <Button variant="secondary" onClick={() => setAction("unfreeze")}>
            Unfreeze wallet
          </Button>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reserve report</CardTitle>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={report?.entries ?? []}
            loading={loading}
            emptyMessage="No reserve entries"
            rowKey={(_, i) => i}
            columns={[
              { key: "label", header: "Account", render: (r) => r.label || r.account || "—" },
              { key: "currency", header: "Currency", render: (r) => r.currency || "HTG" },
              {
                key: "balance",
                header: "Balance",
                className: "text-right",
                render: (r) => formatAmount(r.balance, r.currency || "HTG"),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={action === "mint"}
        onClose={() => setAction(null)}
        title="Mint stablecoin"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                askConfirm("Confirm mint", `Mint ${mintForm.amount} ${status?.assetCode || "HTGe"}?`, async () => {
                  await treasuryService.mint(mintForm);
                  setConfirm(null);
                  setAction(null);
                  await refresh();
                })
              }
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput
            label="Amount"
            type="number"
            min={0}
            value={mintForm.amount}
            onChange={(e) => setMintForm({ ...mintForm, amount: Number(e.target.value) })}
          />
          <FormInput
            label="Destination (optional)"
            placeholder="Stellar address or wallet id"
            value={mintForm.destination || ""}
            onChange={(e) => setMintForm({ ...mintForm, destination: e.target.value })}
          />
          <FormTextarea
            label="Memo / reason"
            value={mintForm.memo || ""}
            onChange={(e) => setMintForm({ ...mintForm, memo: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={action === "burn"}
        onClose={() => setAction(null)}
        title="Burn stablecoin"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                askConfirm("Confirm burn", `Burn ${burnForm.amount} ${status?.assetCode || "HTGe"}?`, async () => {
                  await treasuryService.burn(burnForm);
                  setConfirm(null);
                  setAction(null);
                  await refresh();
                })
              }
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput
            label="Amount"
            type="number"
            min={0}
            value={burnForm.amount}
            onChange={(e) => setBurnForm({ ...burnForm, amount: Number(e.target.value) })}
          />
          <FormInput
            label="Source (optional)"
            placeholder="Distribution account / wallet id"
            value={burnForm.source || ""}
            onChange={(e) => setBurnForm({ ...burnForm, source: e.target.value })}
          />
          <FormTextarea
            label="Memo / reason"
            value={burnForm.memo || ""}
            onChange={(e) => setBurnForm({ ...burnForm, memo: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={action === "freeze" || action === "unfreeze"}
        onClose={() => setAction(null)}
        title={action === "freeze" ? "Freeze wallet" : "Unfreeze wallet"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant={action === "freeze" ? "danger" : "primary"}
              onClick={() =>
                askConfirm(
                  action === "freeze" ? "Confirm freeze" : "Confirm unfreeze",
                  `${action === "freeze" ? "Freeze" : "Unfreeze"} ${freezeForm.walletAddress}?`,
                  async () => {
                    if (action === "freeze") await treasuryService.freezeWallet(freezeForm);
                    else await treasuryService.unfreezeWallet(freezeForm);
                    setConfirm(null);
                    setAction(null);
                    await refresh();
                  }
                )
              }
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormInput
            label="Wallet address"
            placeholder="G…"
            value={freezeForm.walletAddress}
            onChange={(e) => setFreezeForm({ ...freezeForm, walletAddress: e.target.value })}
          />
          <FormTextarea
            label="Reason"
            value={freezeForm.reason || ""}
            onChange={(e) => setFreezeForm({ ...freezeForm, reason: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        destructive
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
