import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormInput } from "@/components/ui/FormInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { shortHash } from "@/lib/utils";
import { userService } from "@/services/userService";
import { treasuryService, type DisburseResult } from "@/services/treasuryService";
import type { AdminUserSummary } from "@/types/intelligence";

type Phase = "idle" | "processing" | "confirmed" | "reconcile" | "error";

// Distinct 6-char idempotency key so retries of the SAME intent never double-issue.
function newIdemKey(): string {
  const rnd = (globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "");
  return `adm-disb-${rnd.slice(0, 12)}`;
}

export default function Disbursement() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminUserSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [idemKey, setIdemKey] = useState(newIdemKey());
  const [confirming, setConfirming] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DisburseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const canSubmit =
    !!selected && selected.has_wallet && amountNum > 0 && reason.trim().length > 0 && phase !== "processing";

  async function search() {
    setSearching(true);
    setError(null);
    try {
      const res = await userService.list({ q: q.trim(), limit: 10 });
      setResults(res.users ?? []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSearching(false);
    }
  }

  function selectUser(u: AdminUserSummary) {
    setSelected(u);
    setResult(null);
    setPhase("idle");
    setError(null);
    setIdemKey(newIdemKey()); // fresh intent per beneficiary/amount session
  }

  async function submit() {
    if (!selected) return;
    setConfirming(false);
    setPhase("processing");
    setError(null);
    setResult(null);
    try {
      const res = await treasuryService.disburse({
        user_id: selected.id,
        amount: amountNum,
        reason: reason.trim(),
        idempotency_key: idemKey, // reused on retry → never double-issues
      });
      setResult(res);
      setPhase("confirmed");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setPhase("reconcile");
        setError(
          "On-chain outcome is uncertain — this disbursement needs reconciliation. Do NOT retry; an operator must verify Horizon before any re-issue.",
        );
      } else {
        setPhase("error");
        setError(apiErrorMessage(e));
      }
    }
  }

  return (
    <AppLayout>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Beneficiary selection */}
        <Card>
          <CardHeader>
            <CardTitle>1 · Beneficiary</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex gap-2">
              <FormInput
                name="q"
                placeholder="Search by name or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
              <Button onClick={search} disabled={searching}>
                {searching ? "…" : "Search"}
              </Button>
            </div>
            <div className="divide-y divide-ink-100">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`flex w-full items-center justify-between py-2 text-left text-sm ${
                    selected?.id === u.id ? "font-semibold text-brand-600" : "text-ink-700"
                  }`}
                >
                  <span>
                    {u.name} · {u.phone}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={u.kyc_tier} />
                    {!u.has_wallet && <span className="text-xs text-red-500">no wallet</span>}
                  </span>
                </button>
              ))}
              {!results.length && <p className="py-2 text-sm text-ink-400">No users — search above.</p>}
            </div>
          </CardBody>
        </Card>

        {/* Disbursement form */}
        <Card>
          <CardHeader>
            <CardTitle>2 · Disburse HTGe</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {selected ? (
              <div className="rounded-lg bg-ink-50 p-3 text-sm">
                <div className="font-medium text-ink-900">{selected.name}</div>
                <div className="text-ink-500">{selected.phone}</div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selected.kyc_tier} />
                  {selected.has_wallet ? (
                    <span className="text-xs text-green-600">wallet provisioned</span>
                  ) : (
                    <span className="text-xs text-red-500">no wallet — cannot disburse</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-400">Select a beneficiary first.</p>
            )}

            <FormInput
              label="Amount (HTGe)"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!selected}
            />
            <FormInput
              label="Reason (required)"
              name="reason"
              placeholder="Initial funding / promo / ticket #"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={!selected}
            />
            <p className="text-xs text-ink-400">Idempotency key: <code>{idemKey}</code></p>

            <Button className="w-full" disabled={!canSubmit} onClick={() => setConfirming(true)}>
              {phase === "processing" ? "Processing…" : "Disburse"}
            </Button>

            {/* State machine result */}
            {phase === "processing" && (
              <p className="text-sm text-amber-600">Broadcasting on-chain + posting ledger…</p>
            )}
            {phase === "confirmed" && result && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                <div className="font-semibold text-green-700">
                  Confirmed {result.idempotent_replay ? "(idempotent replay)" : ""}
                </div>
                <div className="mt-1 text-ink-700">
                  {result.amount} {result.asset_code} → user #{result.user_id}
                </div>
                {result.stellar_tx_hash && (
                  <a
                    className="mt-1 block text-brand-600 underline"
                    href={`https://stellar.expert/explorer/testnet/tx/${result.stellar_tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Stellar tx: {shortHash(result.stellar_tx_hash)}
                  </a>
                )}
                <div className="mt-1 text-xs text-ink-500">
                  audit/timeline ref — journal #{result.journal_id} · exec {result.execution_id}
                </div>
              </div>
            )}
            {phase === "reconcile" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠ {error}
              </div>
            )}
            {phase === "error" && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Confirm disbursement"
        message={`Issue ${amount} HTGe to ${selected?.name ?? ""} (${selected?.phone ?? ""})? This mints new supply on testnet and credits their wallet. Idempotency key ${idemKey}.`}
        confirmLabel="Disburse"
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </AppLayout>
  );
}
