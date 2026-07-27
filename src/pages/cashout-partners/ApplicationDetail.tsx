import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cashoutPartnerService as svc } from "@/services/cashoutPartnerService";
import { allowedActions, type PartnerAction, type PartnerApplication, type PartnerNote, type PartnerTimelineEvent } from "@/types/cashoutPartner";

interface ActionMeta {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  field?: "reviewer" | "message" | "note";
  required?: boolean;
  destructive?: boolean;
}

const ACTION_META: Record<PartnerAction, ActionMeta> = {
  assign: { label: "Assign to Reviewer", field: "reviewer", required: true },
  "start-review": { label: "Move to Under Review", variant: "primary" },
  "request-info": { label: "Request Additional Information", field: "message", required: true, variant: "primary" },
  approve: { label: "Approve", variant: "primary" },
  reject: { label: "Reject", field: "note", variant: "danger", destructive: true },
  provision: { label: "Provision Partner", variant: "primary" },
  activate: { label: "Activate Marketplace", variant: "primary" },
  suspend: { label: "Suspend", field: "note", variant: "danger", destructive: true },
  deactivate: { label: "Deactivate Marketplace", variant: "danger", destructive: true },
};

export default function PartnerApplicationDetail() {
  const { id } = useParams();
  const appId = Number(id);
  const navigate = useNavigate();
  const [app, setApp] = useState<PartnerApplication | null>(null);
  const [timeline, setTimeline] = useState<PartnerTimelineEvent[]>([]);
  const [notes, setNotes] = useState<PartnerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<PartnerAction | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [confirm, setConfirm] = useState<PartnerAction | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    const [a, t, n] = await Promise.allSettled([svc.getApplication(appId), svc.timeline(appId), svc.listNotes(appId)]);
    if (a.status === "fulfilled") setApp(a.value); else setError(apiErrorMessage(a.reason));
    if (t.status === "fulfilled") setTimeline(t.value);
    if (n.status === "fulfilled") setNotes(n.value);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [appId]);

  const actions = useMemo(() => (app ? allowedActions(app.status) : []), [app]);
  const meta = action ? ACTION_META[action] : null;

  async function runConfirm(a: PartnerAction) {
    setBusy(true);
    try {
      await svc.decide(appId, a);
      await refresh();
    } catch (err) { setError(apiErrorMessage(err)); }
    setBusy(false);
    setConfirm(null);
  }

  async function runWithInput() {
    if (!action || !meta) return;
    if (meta.required && !actionInput.trim()) return;
    setBusy(true);
    try {
      if (action === "assign") await svc.assign(appId, Number(actionInput));
      else if (action === "request-info") await svc.decide(appId, "request-info", { message: actionInput.trim() });
      else await svc.decide(appId, action, { note: actionInput.trim() || undefined });
      await refresh();
      setAction(null);
      setActionInput("");
    } catch (err) { setError(apiErrorMessage(err)); }
    setBusy(false);
  }

  async function addNote() {
    if (!noteDraft.trim()) return;
    setBusy(true);
    try { await svc.addNote(appId, noteDraft.trim()); setNoteDraft(""); await refresh(); }
    catch (err) { setError(apiErrorMessage(err)); }
    setBusy(false);
  }

  function triggerAction(a: PartnerAction) {
    const m = ACTION_META[a];
    if (m.field) { setAction(a); setActionInput(""); }
    else setConfirm(a);
  }

  return (
    <AppLayout title="Partner Application" subtitle={app ? `#${app.id} · ${app.display_name || app.user.name || `User ${app.user_id}`}` : "Loading…"}>
      <button onClick={() => navigate("/cashout-partners/applications")} className="mb-4 text-sm text-brand-600 hover:underline">
        ← Back to applications
      </button>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && !app ? (
        <div className="text-ink-400">Loading…</div>
      ) : app ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={app.status} />
            <span className="text-xs text-ink-400">Availability:</span>
            <StatusBadge status={app.availability} />
            {app.assigned_reviewer && <span className="text-xs text-ink-400">Reviewer #{app.assigned_reviewer}</span>}
          </div>

          {/* The core separation the console must make explicit. */}
          <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            <b>Approved ≠ Marketplace Active.</b> Approval accepts the applicant. <b>Provision Partner</b> creates the
            partner profile. <b>Activate Marketplace</b> makes them eligible to receive requests. Availability
            (Available/Offline) stays controlled by the partner in the wallet.
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* left: profile / business / compliance */}
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                <CardBody>
                  <div className="flex items-start gap-4">
                    {app.photo_url ? (
                      <img src={app.photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-600">
                        {(app.display_name || app.user.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <Field label="Display name" value={app.display_name} />
                      <Field label="Business name" value={app.business_name} />
                      <Field label="Wallet ID" value={app.user.wallet_id} mono />
                      <Field label="Phone" value={app.contact_phone || app.user.phone} />
                      <Field label="Email" value={app.user.email} />
                      <Field label="Languages" value={app.languages.join(", ")} />
                    </dl>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Business information</CardTitle></CardHeader>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <Field label="Operating city" value={app.operating_city} />
                    <Field label="Neighborhood" value={app.neighborhood} />
                    <Field label="Operating days" value={app.operating_days.join(", ")} />
                    <Field label="Hours" value={app.operating_hours_start ? `${app.operating_hours_start} – ${app.operating_hours_end || ""}` : null} />
                    <Field label="Typical cash" value={app.typical_cash_available ? `${app.typical_cash_available} HTG` : null} />
                    <Field label="Payout range" value={app.min_payout ? `${app.min_payout} – ${app.max_payout || ""} HTG` : null} />
                    <Field label="Payout methods" value={app.payout_methods.join(", ")} />
                    <Field label="Preferred contact" value={app.preferred_contact} />
                  </dl>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
                <CardBody>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <Field label="KYC status" value={app.compliance.kyc_tier} />
                    <Field label="Account standing" value={app.compliance.account_standing} />
                    <Field label="Trust score" value={app.compliance.trust_band} />
                    <Field label="Open risk flags" value={String(app.compliance.open_risk_flags)} />
                    <Field label="Previous disputes" value={`${app.compliance.previous_disputes} (marketplace inactive)`} />
                  </dl>
                </CardBody>
              </Card>
            </div>

            {/* right: actions / timeline / notes */}
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                <CardBody className="space-y-2">
                  {actions.length === 0 && <div className="text-sm text-ink-400">No actions available for this state.</div>}
                  {actions.map((a) => (
                    <Button key={a} variant={ACTION_META[a].variant ?? "secondary"} className="w-full justify-center"
                      disabled={busy} onClick={() => triggerAction(a)}>
                      {ACTION_META[a].label}
                    </Button>
                  ))}
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                <CardBody>
                  <ol className="space-y-3">
                    {timeline.length === 0 && <li className="text-sm text-ink-400">No events yet.</li>}
                    {timeline.map((e, i) => (
                      <li key={i} className="border-l-2 border-brand-100 pl-3">
                        <div className="text-sm font-medium text-ink-800">{e.label}</div>
                        {e.detail && <div className="text-xs text-ink-500">{e.detail}</div>}
                        <div className="text-[11px] text-ink-400">
                          {formatDateTime(e.at)}{e.actor ? ` · ${e.actor}` : ""}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Internal notes</CardTitle></CardHeader>
                <CardBody className="space-y-3">
                  <div className="space-y-2">
                    <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3}
                      placeholder="Append an internal note (immutable)…"
                      className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                    <Button size="sm" disabled={busy || !noteDraft.trim()} onClick={addNote}>Add note</Button>
                  </div>
                  <ul className="space-y-3">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-lg bg-ink-50 px-3 py-2">
                        <div className="text-sm text-ink-800">{n.body}</div>
                        <div className="text-[11px] text-ink-400">{n.author_name} · {formatDateTime(n.created_at)}</div>
                      </li>
                    ))}
                    {notes.length === 0 && <li className="text-sm text-ink-400">No notes yet.</li>}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {/* input action modal (assign / request-info / reject / suspend) */}
      <Modal open={!!action} onClose={() => setAction(null)} title={meta?.label}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant={meta?.variant ?? "primary"} loading={busy}
              disabled={busy || (meta?.required && !actionInput.trim())} onClick={runWithInput}>
              {meta?.label}
            </Button>
          </>
        }>
        {meta?.field === "reviewer" ? (
          <input type="number" value={actionInput} onChange={(e) => setActionInput(e.target.value)}
            placeholder="Reviewer user ID"
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        ) : (
          <textarea value={actionInput} onChange={(e) => setActionInput(e.target.value)} rows={4}
            placeholder={meta?.field === "message" ? "Message shown to the applicant…" : "Reason (optional, internal)…"}
            className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        )}
      </Modal>

      {/* confirm-only actions */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm ? ACTION_META[confirm].label : ""}
        message={confirm ? `${ACTION_META[confirm].label} this application?` : ""}
        destructive={confirm ? ACTION_META[confirm].destructive : false}
        onConfirm={() => { if (confirm) void runConfirm(confirm); }}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-ink-800 break-all" : "text-ink-800"}>{value || "—"}</dd>
    </div>
  );
}
