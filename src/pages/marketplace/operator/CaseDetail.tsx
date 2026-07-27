import { ReactNode, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/FormInput";
import {
  FeatureGate,
  MoneyBreakdown,
  OfflineBanner,
  ParticipantPage,
  StateBadge,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatDateTime, formatMoney } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import {
  ADJUDICATION_REASONS,
  FOUR_EYES_LABEL,
  NOTE_CATEGORIES,
  ageText,
  reviewReasonLabel,
} from "@/lib/marketplaceOperator";
import { marketplaceError, marketplaceOperatorService as svc } from "@/services/marketplaceOperatorService";
import type { AdjudicationPreview, OperatorCaseContext } from "@/types/marketplaceOperator";

// M4A-3 · operator case detail + adjudication. Every section is read-only/operator-safe. Money moves
// ONLY through the four-eyes propose/approve backend (canonical settle/compensate); the operator never
// enters amounts/accounts. A forced refresh runs before every decision; two explicit confirmations are
// required; offline blocks all actions; the backend is the final authority.

const TEST_NOTICE = "TEST TRANSACTION — NO PHYSICAL CASH WAS DISBURSED";
const idem = () => `op-${(globalThis.crypto?.randomUUID?.() ?? String(Math.random())).replace(/-/g, "").slice(0, 12)}`;

export default function CaseDetail() {
  const { ref = "" } = useParams();
  const online = useOnline();
  const res = useAsyncResource<OperatorCaseContext>(() => svc.caseContext(ref), [ref]);
  useLifecycleRefresh(res.reload);
  const c = res.data;

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
      title="Case"
      subtitle={ref}
      actions={
        <div className="flex gap-2">
          <Link to="/operator/marketplace"><Button size="sm" variant="ghost">Back</Button></Link>
          <Button size="sm" variant="secondary" onClick={res.reload} disabled={res.loading}>Refresh</Button>
        </div>
      }
    >
      <OfflineBanner online={online} />
      <TestNotice notice={c ? TEST_NOTICE : null} className="mb-4" />
      {banner && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{banner}</div>}

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        {res.loading && !c ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : c ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Summary c={c} />
              <QuoteSnapshot c={c} />
              <FinancialState c={c} />
              <LiquidityState c={c} />
              <EvidencePanels c={c} />
              <DisputeStatements c={c} />
              <Reconciliation c={c} />
              <Timeline c={c} />
            </div>
            <div className="space-y-4">
              <AdjudicationPanel c={c} ref_={ref} online={online} busy={busy} act={act} setBanner={setBanner} reload={res.reload} />
              <ParticipantContext c={c} />
              <Notes c={c} ref_={ref} online={online} act={act} />
              <FinalOutcome c={c} />
              <ReplayPanel ref_={ref} />
            </div>
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-ink-400">Case not found.</Card>
        )}
      </FeatureGate>
    </ParticipantPage>
  );
}

// ── section helpers ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-50 py-1 text-sm last:border-0">
      <span className="text-ink-500">{k}</span>
      <span className="font-medium text-ink-800">{v}</span>
    </div>
  );
}
const yn = (b: boolean) => (b ? "Yes" : "No");

function Summary({ c }: { c: OperatorCaseContext }) {
  return (
    <Section title="Case summary">
      <div className="mb-2 flex items-center gap-2">
        <StateBadge state={c.state} />
        <span className="text-xs text-ink-400">{c.payment_ref}</span>
      </div>
      <KV k="Review reason" v={reviewReasonLabel(c.review_reason)} />
      <KV k="Review source" v={c.review_source ?? "—"} />
      <KV k="Participant" v={c.participant_display} />
      <KV k="Collection location" v={c.collection_location ?? "—"} />
      <KV k="Cash amount" v={formatMoney(c.cash_amount, c.currency)} />
      <KV k="Case age" v={ageText(c.case_age_seconds)} />
      <KV k="Terminal status" v={c.terminal_status ?? "—"} />
      <KV k="Dispute status" v={c.dispute_status ?? "—"} />
    </Section>
  );
}

function QuoteSnapshot({ c }: { c: OperatorCaseContext }) {
  const q = c.quote;
  if (!q) return null;
  return (
    <Section title="Immutable quote snapshot">
      <MoneyBreakdown principal={q.participant_principal} compensation={q.participant_compensation} total={q.total_participant_entitlement} currency={c.currency} />
      <div className="mt-2">
        <KV k="Total customer debit" v={formatMoney(q.total_customer_debit, c.currency)} />
        <KV k="Kiwoo fee" v={formatMoney(q.kiwoo_fee, c.currency)} />
        <KV k="Tax" v={formatMoney(q.tax, c.currency)} />
        <KV k="Regulatory fee" v={formatMoney(q.regulatory_fee, c.currency)} />
        <KV k="Quote expiry" v={formatDateTime(q.quote_expiry)} />
        <KV k="Pricing policy v" v={q.pricing_policy_version ?? "—"} />
      </div>
      <p className="mt-2 text-[11px] text-ink-400">Read-only. Kiwoo-authoritative — the console never recomputes pricing.</p>
    </Section>
  );
}

function FinancialState({ c }: { c: OperatorCaseContext }) {
  const f = c.financial;
  return (
    <Section title="Financial state">
      <KV k="Reserve exists" v={yn(f.reserve_exists)} />
      <KV k="Settlement journal exists" v={yn(f.settlement_journal_exists)} />
      <KV k="Compensation journal exists" v={yn(f.compensation_journal_exists)} />
      <KV k="Settle XOR compensate ok" v={yn(f.settle_xor_compensate_ok)} />
      <KV k="Participant entitlement posted" v={yn(f.participant_entitlement_posted)} />
      <KV k="Customer restored" v={yn(f.customer_restored)} />
      <p className="mt-2 text-[11px] text-ink-400">Invariant status only — no editable ledger legs or account selection.</p>
    </Section>
  );
}

function LiquidityState({ c }: { c: OperatorCaseContext }) {
  const l = c.liquidity;
  return (
    <Section title="Liquidity state">
      <KV k="Matched offer" v={l.matched_offer_ref ?? "—"} />
      <KV k="Lock present" v={yn(l.lock_present)} />
      <KV k="Lock consumed" v={yn(l.lock_consumed)} />
      <KV k="Lock released" v={yn(l.lock_released)} />
      <KV k="Handover prohibits release" v={yn(l.handover_prohibits_release)} />
    </Section>
  );
}

function EvidencePanels({ c }: { c: OperatorCaseContext }) {
  return (
    <Section title="Evidence">
      <div className="mb-1 text-xs font-semibold text-ink-600">Participant actions</div>
      <KV k="Accepted" v={formatDateTime(c.participant_actions.accepted_at)} />
      <KV k="Rejected" v={formatDateTime(c.participant_actions.rejected_at)} />
      <KV k="Rejection reason" v={c.participant_actions.rejection_reason ?? "—"} />
      <div className="mt-3 mb-1 text-xs font-semibold text-ink-600">Credential</div>
      <KV k="Issued" v={yn(c.credential_evidence.issued)} />
      <KV k="Verified" v={yn(c.credential_evidence.verified)} />
      <KV k="Verified at" v={formatDateTime(c.credential_evidence.verified_at)} />
      <KV k="Single-use / expired" v={`${yn(c.credential_evidence.single_use)} / ${yn(c.credential_evidence.expired)}`} />
      <div className="mt-3 mb-1 text-xs font-semibold text-ink-600">Handover (distinct from credential + receipt)</div>
      <KV k="Handover confirmed" v={yn(c.handover_evidence.exists)} />
      <KV k="Confirmed at" v={formatDateTime(c.handover_evidence.confirmed_at)} />
      <KV k="Amount binding" v={c.handover_evidence.amount_binding ? formatMoney(c.handover_evidence.amount_binding, c.currency) : "—"} />
      <div className="mt-3 mb-1 text-xs font-semibold text-ink-600">Customer receipt</div>
      <KV k="Confirmed" v={yn(c.receipt_evidence.customer_confirmed)} />
      <KV k="Denied" v={yn(c.receipt_evidence.customer_denied)} />
      <KV k="Timed out" v={yn(c.receipt_evidence.timed_out)} />
    </Section>
  );
}

function DisputeStatements({ c }: { c: OperatorCaseContext }) {
  return (
    <Section title="Dispute statements">
      {c.dispute_statements.length === 0 ? (
        <p className="text-sm text-ink-400">No party statements recorded.</p>
      ) : (
        <ul className="space-y-2">
          {c.dispute_statements.map((s, i) => (
            <li key={i} className="rounded border border-ink-100 p-2 text-sm">
              <div className="flex justify-between text-xs text-ink-400"><span>{s.source}</span><span>{formatDateTime(s.at)}</span></div>
              <div className="text-ink-700">{s.reason_code ?? "—"}{s.statement ? ` · ${s.statement}` : ""}</div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Reconciliation({ c }: { c: OperatorCaseContext }) {
  return (
    <Section title="Reconciliation + evidence-policy verdict">
      <KV k="Reason" v={c.reconciliation.reason_code ?? "—"} />
      <KV k="Requires human review" v={yn(c.reconciliation.requires_human_review)} />
      <KV k="Consistency" v={c.reconciliation.consistency} />
      <KV k="Evidence-policy verdict" v={c.evidence_policy_verdict ?? "—"} />
    </Section>
  );
}

function Timeline({ c }: { c: OperatorCaseContext }) {
  return (
    <Section title="Immutable timeline">
      {c.timeline.length === 0 ? (
        <p className="text-sm text-ink-400">No events.</p>
      ) : (
        <ol className="space-y-1">
          {c.timeline.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="w-40 shrink-0 text-ink-400">{formatDateTime(e.at)}</span>
              <span className="text-ink-700">{e.type} · {e.actor_type} · {e.result.toLowerCase()}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function ParticipantContext({ c }: { c: OperatorCaseContext }) {
  const p = c.participant_operational;
  return (
    <Section title="Participant context">
      {!p ? (
        <p className="text-sm text-ink-400">No history.</p>
      ) : (
        <>
          <KV k="Acceptance rate" v={p.acceptance_rate ?? "—"} />
          <KV k="Rejection rate" v={p.rejection_rate ?? "—"} />
          <KV k="Timeout rate" v={p.timeout_rate ?? "—"} />
          <KV k="Dispute rate" v={p.dispute_rate ?? "—"} />
          <KV k="Sample size" v={p.sample_size} />
          <p className="mt-1 text-[11px] text-ink-400">Context only — not an automatic adjudication score.</p>
        </>
      )}
    </Section>
  );
}

function FinalOutcome({ c }: { c: OperatorCaseContext }) {
  const o = c.final_outcome;
  if (!o) return null;
  return (
    <Section title="Final outcome">
      <KV k="Decision" v={o.decision ?? "—"} />
      <KV k="Adjudicating operator" v={o.adjudicating_operator ?? "—"} />
      <KV k="Approving operator" v={o.approving_operator ?? "—"} />
      <KV k="Reason" v={o.reason ?? "—"} />
      <KV k="Policy version" v={o.policy_version ?? "—"} />
      <KV k="Decided at" v={formatDateTime(o.decided_at)} />
      <KV k="Settlement status" v={o.settlement_status ?? "—"} />
      <p className="mt-1 text-[11px] text-ink-400">Read-only and immutable.</p>
    </Section>
  );
}

// ── adjudication panel (four-eyes) ────────────────────────────────────────────
function AdjudicationPanel({
  c, ref_, online, busy, act, setBanner, reload,
}: {
  c: OperatorCaseContext;
  ref_: string;
  online: boolean;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  setBanner: (s: string | null) => void;
  reload: () => Promise<void>;
}) {
  const disabled = busy || !online;
  const fe = c.four_eyes;
  const [decision, setDecision] = useState<"SETTLE" | "COMPENSATE">("SETTLE");
  const [reason, setReason] = useState(ADJUDICATION_REASONS[0].code);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<AdjudicationPreview | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [mode, setMode] = useState<"propose" | "approve" | null>(null);

  // Already decided → the FinalOutcome card shows it; nothing actionable.
  if (c.final_outcome || c.terminal_status === "COMPLETED" || c.terminal_status === "COMPENSATED") {
    return <Section title="Adjudication"><p className="text-sm text-ink-600">This case is terminal. See the final outcome.</p></Section>;
  }

  async function openPreview(forDecision: "SETTLE" | "COMPENSATE", asMode: "propose" | "approve") {
    setBanner(null);
    try {
      await reload(); // forced refresh before showing impact
      const p = await svc.preview(ref_, forDecision);
      setPreview(p);
      setConfirm(false);
      setMode(asMode);
    } catch (e) {
      setBanner(marketplaceError(e).message);
    }
  }

  return (
    <Section title="Adjudication (four-eyes)">
      <div className="mb-2 text-xs">
        <span className="text-ink-500">Policy: </span>
        <span className="font-medium">{FOUR_EYES_LABEL[fe.status]}</span>
        {fe.reasons.length > 0 && <span className="text-ink-400"> · {fe.reasons.join(", ")}</span>}
      </div>

      {/* Pending proposal → a DIFFERENT operator approves/rejects */}
      {fe.status === "SECOND_APPROVAL_PENDING" && fe.proposal ? (
        <div className="space-y-2">
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Proposed <b>{fe.proposal.decision}</b> by operator #{fe.proposal.proposed_by} · reason {fe.proposal.reason}. A second, different operator must approve. (The maker cannot approve their own proposal — backend-enforced.)
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={disabled} onClick={() => openPreview(fe.proposal!.decision, "approve")}>Review + approve</Button>
            <Button size="sm" variant="secondary" disabled={disabled}
              onClick={() => act(() => svc.reject(fe.proposal!.proposal_id, note || undefined))}>Reject</Button>
          </div>
        </div>
      ) : (
        // No pending proposal → propose a decision
        <div className="space-y-3">
          <FormSelect label="Decision" name="decision" value={decision} onChange={(e) => setDecision(e.target.value as "SETTLE" | "COMPENSATE")}>
            <option value="SETTLE">SETTLE</option>
            <option value="COMPENSATE">COMPENSATE</option>
          </FormSelect>
          <FormSelect label="Reason" name="adjudication_reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {ADJUDICATION_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </FormSelect>
          <FormTextarea label="Operator note (required)" name="operator_note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={disabled || !note.trim()} onClick={() => openPreview(decision, "propose")}>Preview impact</Button>
          <p className="text-[11px] text-ink-400">The operator never enters amounts or accounts — Kiwoo resolves them.</p>
        </div>
      )}

      {/* Impact + two-step confirmation modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={`${mode === "approve" ? "Approve" : "Propose"} — ${preview?.decision} impact`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>Cancel</Button>
            <Button
              disabled={!confirm || busy}
              loading={busy}
              onClick={async () => {
                const p = preview!;
                setPreview(null);
                if (mode === "approve" && fe.proposal) {
                  await act(() => svc.approve(fe.proposal!.proposal_id, note || undefined));
                } else {
                  await act(() => svc.propose(ref_, { decision: p.decision, reason, note }));
                }
              }}
            >
              {mode === "approve" ? "Approve decision" : "Propose decision"}
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-3 text-sm">
            <MoneyBreakdown principal={preview.amounts.participant_principal} compensation={preview.amounts.participant_compensation} total={preview.amounts.total_participant_entitlement} currency={c.currency} />
            {preview.decision === "SETTLE" ? (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                <li>Customer reserve will be consumed.</li>
                <li>Participant principal + compensation will be credited.</li>
                <li>Kiwoo fee recognized; tax + regulatory-fee liabilities posted.</li>
                <li>Liquidity lock consumed. Compensation becomes impossible. Final.</li>
              </ul>
            ) : (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                <li>Customer reserve will be returned.</li>
                <li>Eligible unused lock released where safe.</li>
                <li>Participant principal + compensation will NOT be credited.</li>
                <li>Settlement becomes impossible. Final.</li>
                {preview.compensate_effects?.compensation_prohibited && (
                  <li className="text-red-600 font-medium">Backend will REJECT: compensation prohibited ({preview.compensate_effects.prohibited_reason}).</li>
                )}
              </ul>
            )}
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
              <span>I understand this decision is final and will cause Kiwoo to post the canonical financial outcome shown above.</span>
            </label>
            <TestNotice notice={preview.test_notice} />
          </div>
        )}
      </Modal>
    </Section>
  );
}

// ── operator notes ────────────────────────────────────────────────────────────
function Notes({ c, ref_, online, act }: { c: OperatorCaseContext; ref_: string; online: boolean; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [category, setCategory] = useState(NOTE_CATEGORIES[0].code);
  const [text, setText] = useState("");
  return (
    <Section title="Operator notes (immutable)">
      <div className="space-y-2">
        <FormSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {NOTE_CATEGORIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
        </FormSelect>
        <FormInput label="Note" name="note" value={text} onChange={(e) => setText(e.target.value)} maxLength={128} />
        <Button size="sm" disabled={!online || !text.trim()} onClick={async () => { const t = text; setText(""); await act(() => svc.addNote(ref_, { category, note: t, idempotency_key: idem() })); }}>Add note</Button>
      </div>
      <div className="mt-3 space-y-1">
        {c.notes.length === 0 ? <p className="text-sm text-ink-400">No notes.</p> : c.notes.map((n, i) => (
          <div key={i} className="rounded border border-ink-100 p-2 text-xs">
            <div className="flex justify-between text-ink-400"><span>#{n.operator_id ?? "?"} · {n.category ?? "—"}</span><span>{formatDateTime(n.at)}</span></div>
            <div className="text-ink-700">{n.text}</div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-400">Notes are append-only and never shown to customers or participants.</p>
    </Section>
  );
}

// M4B · Marketplace Replay — lazy, immutable event-driven lifecycle reconstruction with integrity flags.
function ReplayPanel({ ref_ }: { ref_: string }) {
  const [rep, setRep] = useState<Awaited<ReturnType<typeof svc.replay>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function load() {
    if (busy) return;
    setBusy(true); setErr(null);
    try { setRep(await svc.replay(ref_)); } catch (e) { setErr(marketplaceError(e).message); } finally { setBusy(false); }
  }
  const tone = (s: string) => (s === "PRESENT" ? "text-emerald-600" : s === "DUPLICATE" || s === "MISSING" ? "text-red-600" : "text-ink-300");
  return (
    <Section title="Marketplace Replay">
      {!rep ? (
        <Button size="sm" variant="secondary" onClick={load} loading={busy}>Reconstruct lifecycle</Button>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-ink-500">Terminal: <span className="font-medium text-ink-800">{rep.terminal ?? "—"}</span></div>
          {(rep.integrity.has_missing || rep.integrity.has_duplicate || rep.integrity.out_of_order) && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              Integrity: {rep.integrity.has_missing && `missing [${rep.integrity.missing_stages.join(", ")}] `}
              {rep.integrity.has_duplicate && `duplicate [${rep.integrity.duplicate_stages.join(", ")}] `}
              {rep.integrity.out_of_order && "out-of-order"}
            </div>
          )}
          <ol className="space-y-0.5">
            {rep.stages.map((s) => (
              <li key={s.stage} className="flex items-center justify-between text-xs">
                <span className="text-ink-600">{s.order + 1}. {s.stage.replace(/_/g, " ").toLowerCase()}</span>
                <span className={tone(s.status)}>{s.observed ? (s.first_at ? formatDateTime(s.first_at) : "yes") : s.status.toLowerCase()}</span>
              </li>
            ))}
          </ol>
          <details className="text-xs">
            <summary className="cursor-pointer text-ink-500">Immutable events ({rep.events.length})</summary>
            <ol className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
              {rep.events.map((e, i) => (
                <li key={i} className="flex items-start gap-2"><span className="w-36 shrink-0 text-ink-300">{formatDateTime(e.at)}</span><span className="text-ink-700">{e.event} · {e.actor_type}</span></li>
              ))}
            </ol>
          </details>
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-xs text-red-600">{err}</p>}
    </Section>
  );
}
