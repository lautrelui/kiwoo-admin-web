import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormInput } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  agentFloatService as svc,
  type AgentFloat,
  type FloatPolicy,
  type FloatTopUp,
} from "@/services/agentFloatService";

const OPEN: FloatTopUp["status"][] = ["REQUESTED", "APPROVED"];

/**
 * Governed treasury top-up of a cash agent's float (four-eyes). Reuses the
 * treasury-disburse permission model on the backend; the money move is a single
 * balanced DR TREASURY / CR AGENT journal, exactly-once. The requester can
 * neither approve nor execute their own request.
 */
export function AgentFloatPanel({ agentUserId }: { agentUserId: number }) {
  const { user } = useAuth();
  const myId = user?.id != null ? Number(user.id) : undefined;

  const [float, setFloat] = useState<AgentFloat | null>(null);
  const [rows, setRows] = useState<FloatTopUp[]>([]);
  const [policy, setPolicy] = useState<FloatPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => Promise<void> }>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [f, l, p] = await Promise.allSettled([svc.getFloat(agentUserId), svc.list(agentUserId), svc.policy()]);
    if (f.status === "fulfilled") setFloat(f.value);
    if (l.status === "fulfilled") setRows(l.value);
    else setError(apiErrorMessage(l.reason));
    if (p.status === "fulfilled") setPolicy(p.value);
  }, [agentUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function guard(key: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function submitRequest() {
    await guard("create", async () => {
      await svc.create(agentUserId, { amount: amount.trim(), reason: reason.trim() });
      setShowForm(false);
      setAmount("");
      setReason("");
    });
  }

  const open = rows.filter((r) => OPEN.includes(r.status));
  const history = rows.filter((r) => !OPEN.includes(r.status));
  const disabledReason = policy && !policy.enabled ? "Top-up is disabled (fail-closed)." : undefined;

  return (
    <Card className="mt-5">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Agent Float</CardTitle>
        <Button
          size="sm"
          disabled={!!disabledReason || busy === "create"}
          title={disabledReason}
          onClick={() => setShowForm(true)}
        >
          Request top-up
        </Button>
      </CardHeader>
      <CardBody>
        {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Digital float" value={float ? `${float.float_balance} ${float.asset_code}` : "—"} />
          <StatCard label="Max cash-in it can serve" value={float ? `${float.max_cash_in} ${float.asset_code}` : "—"} />
          <StatCard label="As of" value={float ? formatDateTime(float.as_of) : "—"} />
        </div>
        <p className="mb-4 text-xs text-ink-400">
          Cash-in debits this float; cash-out credits it. Treasury top-up is for bootstrap / exceptional
          support / adjustments — not routine daily replenishment.
        </p>

        {/* Pending — four-eyes approve/execute */}
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Pending</div>
        {open.length === 0 && <p className="mb-4 text-sm text-ink-400">No pending top-up requests.</p>}
        {open.map((r) => {
          const iRequested = myId != null && myId === r.requested_by;
          return (
            <div key={r.reference} className="border-b border-ink-100 py-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-ink-900">
                  {r.amount} {r.asset_code} · {r.reason}
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-1 text-ink-500">
                requested_by #{r.requested_by}
                {r.approved_by != null && ` · approved_by #${r.approved_by}`}
              </div>
              <div className="mt-2 flex gap-2">
                {r.status === "REQUESTED" && (
                  <Button
                    size="sm"
                    disabled={iRequested || busy === `app-${r.reference}`}
                    title={iRequested ? "You requested this — a different admin must approve (four-eyes)." : undefined}
                    onClick={() =>
                      setConfirm({
                        title: "Approve top-up (four-eyes)",
                        message: `Approve a ${r.amount} ${r.asset_code} float top-up? You must be a different admin than the requester.`,
                        run: () => guard(`app-${r.reference}`, () => svc.approve(r.reference)),
                      })
                    }
                  >
                    {iRequested ? "You requested" : "Approve"}
                  </Button>
                )}
                {r.status === "APPROVED" && (
                  <Button
                    size="sm"
                    disabled={iRequested || busy === `exe-${r.reference}`}
                    title={iRequested ? "You requested this — a different admin must execute (four-eyes)." : undefined}
                    onClick={() =>
                      setConfirm({
                        title: "Execute top-up",
                        message: `Execute a ${r.amount} ${r.asset_code} top-up? This moves money: DR Treasury / CR agent float.`,
                        run: () => guard(`exe-${r.reference}`, () => svc.execute(r.reference)),
                      })
                    }
                  >
                    {iRequested ? "You requested" : "Execute"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === `rej-${r.reference}`}
                  onClick={() =>
                    setConfirm({
                      title: "Reject top-up",
                      message: `Reject this ${r.amount} ${r.asset_code} top-up request?`,
                      run: () => guard(`rej-${r.reference}`, () => svc.reject(r.reference)),
                    })
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          );
        })}

        {/* History */}
        <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-400">History</div>
        {history.length === 0 && <p className="text-sm text-ink-400">No completed top-ups yet.</p>}
        {history.map((r) => (
          <div key={r.reference} className="border-b border-ink-100 py-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-ink-900">
                {r.amount} {r.asset_code} · {r.reason}
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-0.5 text-xs text-ink-400">
              {r.status === "EXECUTED" && r.executed_at && `executed ${formatDateTime(r.executed_at)}`}
              {r.status === "EXECUTED" && r.float_before != null && r.float_after != null && (
                <> · float {r.float_before} → {r.float_after}</>
              )}
              {r.journal_ref != null && <> · journal #{r.journal_ref}</>}
              {r.status === "REJECTED" && r.rejection_note && ` · ${r.rejection_note}`}
            </div>
          </div>
        ))}
      </CardBody>

      {/* Request form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Request float top-up">
        <div className="space-y-3">
          <FormInput
            label={`Amount (${policy?.currency ?? "HTGe"})`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={policy ? `Min ${policy.min_amount} · Max per request ${policy.max_per_request} · Daily max ${policy.daily_max_per_agent}` : undefined}
          />
          <FormInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} hint="Required — e.g. new-agent bootstrap, liquidity support." />
          <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
            Creates a request only. A DIFFERENT admin must approve and execute it before any money moves.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!amount.trim() || reason.trim().length < 3 || busy === "create"} onClick={submitRequest}>
              Submit request
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel="Confirm"
        onConfirm={async () => {
          const run = confirm?.run;
          setConfirm(null);
          if (run) await run();
        }}
        onCancel={() => setConfirm(null)}
      />
    </Card>
  );
}
