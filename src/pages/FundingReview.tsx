import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { shortHash } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  loanFundingService,
  type FundableAgreement,
  type FundingRow,
} from "@/services/loanFundingService";

const idemKey = (agreementId: number) =>
  `fund-${agreementId}-${(globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "").slice(0, 8)}`;

export default function FundingReview() {
  const { user } = useAuth();
  const myId = user?.id;

  const [fundable, setFundable] = useState<FundableAgreement[]>([]);
  const [fundings, setFundings] = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // guards double-submit
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    run: () => Promise<void>;
  }>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    const [f, r] = await Promise.allSettled([loanFundingService.fundable(), loanFundingService.list()]);
    if (f.status === "fulfilled") setFundable(f.value);
    else setError(apiErrorMessage(f.reason));
    if (r.status === "fulfilled") setFundings(r.value);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function guard(key: string, fn: () => Promise<void>) {
    if (busyId) return;
    setBusyId(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Loan funding (four-eyes)</h1>
        <Button variant="secondary" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Fundable agreements — initiate a funding request */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ready for funding — initiate</CardTitle>
        </CardHeader>
        <CardBody>
          {fundable.length === 0 && (
            <p className="text-sm text-ink-400">{loading ? "Loading…" : "No READY_FOR_FUNDING agreements."}</p>
          )}
          {fundable.map((a) => (
            <div key={a.agreement_id} className="flex items-center justify-between border-b border-ink-100 py-3 text-sm">
              <div>
                <div className="font-medium text-ink-900">
                  {a.agreement_ref} · {a.amount} {a.currency}
                </div>
                <div className="text-ink-500">
                  borrower #{a.borrower.id} {a.borrower.name ?? ""} → lender #{a.lender.id} {a.lender.name ?? ""} ·{" "}
                  {a.both_signed ? "both signed ✓" : "signatures incomplete"}
                </div>
              </div>
              {a.existing_funding ? (
                <StatusBadge status={a.existing_funding.status} />
              ) : (
                <Button
                  size="sm"
                  disabled={busyId === `req-${a.agreement_id}`}
                  onClick={() =>
                    setConfirm({
                      title: "Initiate funding request",
                      message: `Create a funding request for ${a.agreement_ref} (${a.amount} ${a.currency})? A DIFFERENT admin must approve it.`,
                      run: () => guard(`req-${a.agreement_id}`, () => loanFundingService.request(a.agreement_id, idemKey(a.agreement_id)).then(() => undefined)),
                    })
                  }
                >
                  Initiate funding
                </Button>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Funding requests — approve (four-eyes) then execute */}
      <Card>
        <CardHeader>
          <CardTitle>Funding requests</CardTitle>
        </CardHeader>
        <CardBody>
          {fundings.length === 0 && <p className="text-sm text-ink-400">No funding requests yet.</p>}
          {fundings.map((f) => {
            const iAmInitiator = myId != null && Number(myId) === f.initiated_by;
            return (
              <div key={f.id} className="border-b border-ink-100 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-ink-900">
                    {f.funding_ref} · {f.principal}
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                <div className="mt-1 text-ink-500">
                  borrower #{f.borrower_id} → lender #{f.lender_id} · initiated_by #{f.initiated_by}
                  {f.approved_by != null && ` · approved_by #${f.approved_by}`}
                </div>
                {f.stellar_tx_hash && (
                  <a
                    className="mt-1 block text-brand-600 underline"
                    href={`https://stellar.expert/explorer/testnet/tx/${f.stellar_tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Stellar tx: {shortHash(f.stellar_tx_hash)}
                  </a>
                )}
                {f.ledger_journal_id != null && (
                  <div className="text-xs text-ink-400">ledger journal #{f.ledger_journal_id}</div>
                )}
                {f.status === "NEEDS_RECONCILIATION" && (
                  <div className="mt-1 rounded bg-amber-50 p-2 text-xs text-amber-800">
                    ⚠ reconciliation required{f.reconcile_reason ? `: ${f.reconcile_reason}` : ""} — do NOT blind-retry.
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  {f.status === "REQUESTED" && (
                    <Button
                      size="sm"
                      disabled={iAmInitiator || busyId === `app-${f.id}`}
                      title={iAmInitiator ? "You initiated this — a different admin must approve (four-eyes)." : undefined}
                      onClick={() =>
                        setConfirm({
                          title: "Approve funding (four-eyes)",
                          message: `Approve ${f.funding_ref}? You must be a different admin than the initiator.`,
                          run: () => guard(`app-${f.id}`, () => loanFundingService.approve(f.id).then(() => undefined)),
                        })
                      }
                    >
                      {iAmInitiator ? "You initiated" : "Approve"}
                    </Button>
                  )}
                  {f.status === "APPROVED" && (
                    <Button
                      size="sm"
                      disabled={busyId === `exe-${f.id}`}
                      onClick={() =>
                        setConfirm({
                          title: "Execute funding",
                          message: `Execute ${f.funding_ref}? This moves money (reserve → Stellar → capture → activate).`,
                          run: () => guard(`exe-${f.id}`, () => loanFundingService.execute(f.id).then(() => undefined)),
                        })
                      }
                    >
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

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
    </AppLayout>
  );
}
