import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FormSelect, FormTextarea } from "@/components/ui/FormInput";
import {
  FeatureGate,
  MoneyBreakdown,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { CredentialInput } from "@/components/marketplace/CredentialInput";
import {
  DISPUTE_REASONS,
  REJECT_REASONS,
  TEST_TRANSACTION_NOTICE,
  formatDateTime,
  formatMoney,
  stateGroup,
  stateInfo,
  timeRemaining,
} from "@/lib/marketplace";
import {
  useAsyncResource,
  useLifecycleRefresh,
  useNowTick,
  useOnline,
} from "@/lib/marketplaceHooks";
import {
  marketplaceError,
  marketplaceParticipantService as svc,
} from "@/services/marketplaceParticipantService";
import type { EvidenceTrailItem, ObligationView } from "@/types/marketplace";

// M4A-2 · obligation detail workspace. Drives the whole participant lifecycle with strict safety:
//  - credential validation and cash-handover confirmation are SEPARATE, deliberate actions;
//  - a FORCED server refresh + client guard runs immediately before the handover dialog;
//  - handover requires a second, explicit confirmation and is irreversible via participant APIs;
//  - offline / stale state blocks all actions; the backend remains the final authority.

export default function ObligationDetail() {
  const { ref = "" } = useParams();
  const online = useOnline();
  const now = useNowTick();

  const res = useAsyncResource<{ o: ObligationView; trail: EvidenceTrailItem[] }>(async () => {
    const [o, trail] = await Promise.all([svc.getObligation(ref), svc.evidenceTrail(ref).catch(() => [])]);
    return { o, trail };
  }, [ref]);
  useLifecycleRefresh(res.reload);

  const o = res.data?.o ?? null;
  const trail = res.data?.trail ?? [];
  const cur = o?.currency_hint ?? "HTG";
  const total = o ? String(Number(o.payout_amount) + Number(o.participant_compensation)) : "0";

  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setBanner(null);
    try {
      await fn();
      await res.reload();
    } catch (e) {
      setBanner(marketplaceError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ParticipantPage
      title="Obligation"
      subtitle={ref}
      actions={
        <div className="flex gap-2">
          <Link to="/participant/marketplace/obligations"><Button size="sm" variant="ghost">Back</Button></Link>
          <Button size="sm" variant="secondary" onClick={res.reload} disabled={res.loading}>Refresh</Button>
        </div>
      }
    >
      <OfflineBanner online={online} />
      <TestNotice notice={o ? TEST_TRANSACTION_NOTICE : null} className="mb-4" />
      {banner && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{banner}</div>}

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        {res.loading && !o ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : o ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <StateBadge state={o.state} />
                  <span className="font-mono text-xs text-ink-400">{o.customer_ref}</span>
                </div>
                <p className="mt-2 text-sm text-ink-600">{stateInfo(o.state).hint}</p>
                <div className="mt-3">
                  <MoneyBreakdown principal={o.payout_amount} compensation={o.participant_compensation} total={total} currency={cur} />
                </div>
                <Deadlines o={o} nowMs={now} />
              </Card>

              <ActionPanel o={o} online={online} busy={busy} act={act} refreshOne={() => svc.getObligation(ref)} setBanner={setBanner} />
            </div>

            <div>
              <ActivityTrail trail={trail} />
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-ink-400">Obligation not found.</Card>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}

function Deadlines({ o, nowMs }: { o: ObligationView; nowMs: number }) {
  const acc = timeRemaining(o.acceptance_deadline, nowMs);
  const col = timeRemaining(o.collection_deadline, nowMs);
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      {o.acceptance_deadline && (
        <div>
          <div className="text-ink-400">Acceptance deadline</div>
          <div className={acc.expired ? "text-red-600" : "text-ink-700"} aria-label={`Acceptance ${acc.text}`}>
            {formatDateTime(o.acceptance_deadline)} · {acc.text}
          </div>
        </div>
      )}
      {o.collection_deadline && (
        <div>
          <div className="text-ink-400">Collection deadline</div>
          <div className={col.expired ? "text-red-600" : "text-ink-700"} aria-label={`Collection ${col.text}`}>
            {formatDateTime(o.collection_deadline)} · {col.text}
          </div>
        </div>
      )}
    </div>
  );
}

// ── State-specific action panel ───────────────────────────────────────────────
function ActionPanel({
  o, online, busy, act, refreshOne, setBanner,
}: {
  o: ObligationView;
  online: boolean;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  refreshOne: () => Promise<ObligationView>;
  setBanner: (s: string | null) => void;
}) {
  const group = stateGroup(o.state);
  const disabled = busy || !online;

  const [reason, setReason] = useState<{ kind: "reject" | "dispute"; code: string; note: string } | null>(null);
  const [handover, setHandover] = useState<{ amount: string; checked: boolean } | null>(null);
  const [receipt, setReceipt] = useState<null | Awaited<ReturnType<typeof svc.receipt>>>(null);

  // Load a terminal receipt when settled/compensated.
  useEffect(() => {
    if ((o.state === "SETTLED" || o.state === "COMPENSATED") && !receipt) {
      svc.receipt(o.fulfilment_ref).then(setReceipt).catch(() => undefined);
    }
  }, [o.state, o.fulfilment_ref, receipt]);

  /** FORCED refresh + client guard immediately before opening the handover dialog. */
  const startHandover = useCallback(async () => {
    setBanner(null);
    try {
      const fresh = await refreshOne(); // live server state (also re-checks ownership → 403 if not owned)
      const g = stateGroup(fresh.state);
      if (fresh.state === "READY_FOR_COLLECTION") {
        setBanner("Validate the customer's collection credential before confirming handover.");
        return;
      }
      if (!(fresh.state === "COLLECTION_CREDENTIAL_VERIFIED" || fresh.state === "READY_FOR_HANDOVER")) {
        setBanner(`Cannot confirm handover from state “${stateInfo(fresh.state).label}”. Refresh and review.`);
        return;
      }
      if (g === "awaiting" || g === "settled") {
        setBanner("Handover was already recorded for this obligation.");
        return;
      }
      if (fresh.payout_amount !== o.payout_amount) {
        setBanner("The amount changed since you loaded this obligation. Refresh and review before handing over.");
        return;
      }
      setHandover({ amount: fresh.payout_amount, checked: false });
    } catch (e) {
      setBanner(marketplaceError(e).message);
    }
  }, [refreshOne, o.payout_amount, setBanner]);

  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold text-ink-900">Next action</div>

      {/* PENDING → accept / reject */}
      {group === "pending" && o.state === "PARTICIPANT_ACCEPTANCE_PENDING" && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={disabled}
            onClick={async () => {
              // Forced refresh before acceptance.
              try {
                const fresh = await refreshOne();
                if (fresh.state !== "PARTICIPANT_ACCEPTANCE_PENDING") { setBanner("This obligation is no longer pending. Refresh."); return; }
                if (timeRemaining(fresh.acceptance_deadline).expired) { setBanner("The acceptance window has expired."); return; }
                await act(() => svc.acceptObligation(o.fulfilment_ref));
              } catch (e) { setBanner(marketplaceError(e).message); }
            }}
          >
            Accept obligation
          </Button>
          <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setReason({ kind: "reject", code: REJECT_REASONS[0].code, note: "" })}>
            Reject
          </Button>
        </div>
      )}

      {/* ACCEPTED → waiting for Kiwoo to issue the customer credential */}
      {o.state === "PARTICIPANT_ACCEPTED" && (
        <p className="text-sm text-ink-600">Accepted. Kiwoo is issuing the customer's one-time collection credential. Refresh to see when it's ready for collection.</p>
      )}

      {/* READY → validate credential (SEPARATE from handover) */}
      {o.state === "READY_FOR_COLLECTION" && (
        <div>
          <p className="mb-2 text-sm text-ink-600">Validate the customer's collection credential. This does <span className="font-semibold">not</span> record cash handover.</p>
          <CredentialInput
            disabled={disabled}
            onValidate={async (code, qrToken) => {
              await act(() => svc.validateCode(o.fulfilment_ref, { code, qr_token: qrToken, expected_amount: o.payout_amount }));
            }}
          />
        </div>
      )}

      {/* CREDENTIAL VERIFIED / READY FOR HANDOVER → confirm handover (forced refresh first) */}
      {(o.state === "COLLECTION_CREDENTIAL_VERIFIED" || o.state === "READY_FOR_HANDOVER") && (
        <div>
          <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Credential verified. <span className="font-semibold">Credential verified does not mean cash has been handed over.</span> Confirm only after you physically hand over the full amount.
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={disabled} onClick={startHandover}>Confirm cash handover</Button>
            <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setReason({ kind: "dispute", code: DISPUTE_REASONS[0].code, note: "" })}>Open dispute</Button>
          </div>
        </div>
      )}

      {/* AWAITING customer confirmation */}
      {group === "awaiting" && (
        <div>
          <p className="text-sm text-ink-600">Cash handover recorded. Awaiting the customer's confirmation of receipt. Settlement and compensation are decided by Kiwoo — a timeout does not automatically settle or compensate.</p>
          <Button size="sm" variant="secondary" className="mt-2" disabled={disabled} onClick={() => setReason({ kind: "dispute", code: DISPUTE_REASONS[0].code, note: "" })}>Open dispute</Button>
        </div>
      )}

      {/* UNDER REVIEW */}
      {group === "review" && (
        <p className="text-sm text-ink-600">This obligation is under Kiwoo review. Settlement and compensation may be frozen; the final financial outcome is decided by Kiwoo, not the participant.</p>
      )}

      {/* SETTLED / COMPENSATED → receipt */}
      {group === "settled" || o.state === "COMPENSATED" ? (
        <div>
          {receipt ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-ink-900">Receipt · {receipt.status}</div>
              <MoneyBreakdown principal={receipt.principal} compensation={receipt.participant_compensation} total={receipt.total_entitlement} currency={receipt.currency_hint} />
              <div className="grid grid-cols-3 gap-2 text-[11px] text-ink-400">
                <div>Accepted<br /><span className="text-ink-600">{formatDateTime(receipt.accepted_at)}</span></div>
                <div>Handover<br /><span className="text-ink-600">{formatDateTime(receipt.handover_confirmed_at)}</span></div>
                <div>Settled<br /><span className="text-ink-600">{formatDateTime(receipt.settled_at)}</span></div>
              </div>
              <TestNotice notice={receipt.test_notice} />
            </div>
          ) : (
            <p className="text-sm text-ink-400">Loading receipt…</p>
          )}
        </div>
      ) : null}

      {group === "closed" && o.state !== "COMPENSATED" && (
        <p className="text-sm text-ink-600">{stateInfo(o.state).hint}</p>
      )}

      {group === "unknown" && (
        <p className="text-sm text-ink-600">This obligation is in a status this app version doesn't recognise. Refresh or contact Kiwoo support — no action is offered to avoid an unsafe transition.</p>
      )}

      {/* Reason modal (reject / dispute) */}
      <Modal
        open={!!reason}
        onClose={() => setReason(null)}
        title={reason?.kind === "reject" ? "Reject obligation" : "Open dispute"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReason(null)} disabled={busy}>Cancel</Button>
            <Button
              variant={reason?.kind === "reject" ? "danger" : "primary"}
              loading={busy}
              onClick={async () => {
                if (!reason) return;
                const r = reason;
                setReason(null);
                if (r.kind === "reject") await act(() => svc.rejectObligation(o.fulfilment_ref, r.code));
                else await act(() => svc.openDispute(o.fulfilment_ref, r.code));
              }}
            >
              {reason?.kind === "reject" ? "Reject" : "Open dispute"}
            </Button>
          </>
        }
      >
        {reason && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">
              {reason.kind === "dispute"
                ? "Opening a dispute sends this obligation to manual review. Settlement and compensation may be frozen. You cannot choose the final financial outcome — Kiwoo operator adjudication is final per policy."
                : "Select a reason. Rejection returns capacity for others and cannot move money."}
            </p>
            <FormSelect label="Reason" value={reason.code} onChange={(e) => setReason({ ...reason, code: e.target.value })}>
              {(reason.kind === "reject" ? REJECT_REASONS : DISPUTE_REASONS).map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </FormSelect>
            {reason.code === "OTHER" && (
              <FormTextarea label="Note (optional)" value={reason.note} onChange={(e) => setReason({ ...reason, note: e.target.value })} />
            )}
          </div>
        )}
      </Modal>

      {/* Handover confirmation — deliberate second confirmation, irreversible */}
      <Modal
        open={!!handover}
        onClose={() => setHandover(null)}
        title="Confirm cash handed over"
        footer={
          <>
            <Button variant="secondary" onClick={() => setHandover(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={!handover?.checked || busy}
              loading={busy}
              onClick={async () => {
                setHandover(null);
                await act(() => svc.confirmHandover(o.fulfilment_ref));
              }}
            >
              Confirm handover
            </Button>
          </>
        }
      >
        {handover && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-ink-100 p-3">
              <div className="flex justify-between"><span className="text-ink-500">Cash amount</span><span className="font-semibold">{formatMoney(handover.amount, o.currency_hint)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Customer</span><span className="font-mono text-xs">{o.customer_ref}</span></div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              This is irreversible through normal participant actions. Confirm only after you have physically handed the full cash amount to the customer.
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={handover.checked} onChange={(e) => setHandover({ ...handover, checked: e.target.checked })} className="mt-1" />
              <span>I confirm that I physically handed the full cash amount shown above to the customer.</span>
            </label>
            <TestNotice notice={TEST_TRANSACTION_NOTICE} />
          </div>
        )}
      </Modal>
    </Card>
  );
}

function ActivityTrail({ trail }: { trail: EvidenceTrailItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
      <CardBody>
        {trail.length === 0 ? (
          <p className="text-sm text-ink-400">No recorded events yet.</p>
        ) : (
          <ol className="space-y-2">
            {trail.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-ink-300">{formatDateTime(e.occurred_at)}</span>
                <span className="text-ink-700">{humanEvidence(e)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function humanEvidence(e: EvidenceTrailItem): string {
  const map: Record<string, string> = {
    PARTICIPANT_ACCEPTED: "You accepted the obligation",
    COLLECTION_CREDENTIAL_VERIFIED: "Customer credential verified",
    HANDOVER_CONFIRMED: "Cash handover confirmed",
    CUSTOMER_RECEIPT_CONFIRMED: "Customer confirmed receipt",
    CUSTOMER_RECEIPT_DENIED: "Customer denied receipt",
    SETTLEMENT: "Settlement completed",
    COMPENSATION: "Compensation completed",
  };
  return `${map[e.type] ?? e.type} · ${e.result.toLowerCase()}`;
}
