import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { FormInput } from "@/components/ui/FormInput";
import {
  FeatureGate,
  OfflineBanner,
  ParticipantPage,
  TestNotice,
} from "@/components/marketplace/atoms";
import { formatMoney } from "@/lib/marketplace";
import { useAsyncResource, useLifecycleRefresh, useOnline } from "@/lib/marketplaceHooks";
import {
  marketplaceError,
  marketplaceParticipantService as svc,
} from "@/services/marketplaceParticipantService";
import type { PositionView } from "@/types/marketplace";

// M4A-2 · position MANAGEMENT. The participant publishes/adjusts capacity + operational constraints — NEVER
// pricing. Client validation is usability-only; the backend is authoritative and its messages are shown
// verbatim. No participant id is ever sent (server resolves identity). All actions guard double-submit.

interface PositionForm {
  currency: string;
  declared_capacity: string;
  min_amount: string;
  max_amount: string;
  participant_cost_bps: string;
  payout_method: string;
  location_label: string;
}

const EMPTY: PositionForm = { currency: "HTG", declared_capacity: "", min_amount: "", max_amount: "", participant_cost_bps: "", payout_method: "", location_label: "" };

/** Client-side usability validation. Returns a field→message map (empty = ok). */
function validate(f: PositionForm): Record<string, string> {
  const e: Record<string, string> = {};
  const declared = Number(f.declared_capacity);
  if (!f.declared_capacity || !Number.isFinite(declared) || declared <= 0) e.declared_capacity = "Enter a positive declared amount.";
  if (!f.currency.trim()) e.currency = "Currency is required.";
  const min = f.min_amount ? Number(f.min_amount) : 0;
  const max = f.max_amount ? Number(f.max_amount) : 0;
  if (f.min_amount && (!Number.isFinite(min) || min < 0)) e.min_amount = "Minimum must be ≥ 0.";
  if (f.max_amount && (!Number.isFinite(max) || max < 0)) e.max_amount = "Maximum must be ≥ 0.";
  if (min > 0 && max > 0 && min > max) e.max_amount = "Maximum must be ≥ minimum.";
  if (f.participant_cost_bps) {
    const bps = Number(f.participant_cost_bps);
    if (!Number.isInteger(bps) || bps < 0 || bps > 10000) e.participant_cost_bps = "Cost input must be an integer between 0 and 10000 bps.";
  }
  return e;
}

export default function ParticipantPositions() {
  const online = useOnline();
  const res = useAsyncResource(() => svc.listPositions(), []);
  useLifecycleRefresh(res.reload);
  const positions = res.data ?? [];

  const [modal, setModal] = useState<null | { mode: "create" | "edit"; ref?: string; form: PositionForm }>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; run: () => Promise<void> }>(null);
  const [adjust, setAdjust] = useState<null | { ref: string; kind: "increase" | "decrease"; amount: string }>(null);

  async function run(fn: () => Promise<unknown>) {
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

  async function submitForm() {
    if (!modal) return;
    const e = validate(modal.form);
    setErrors(e);
    if (Object.keys(e).length) return;
    const f = modal.form;
    const payload = {
      currency: f.currency.trim(),
      declared_capacity: f.declared_capacity,
      min_amount: f.min_amount || undefined,
      max_amount: f.max_amount || undefined,
      participant_cost_bps: f.participant_cost_bps ? Number(f.participant_cost_bps) : undefined,
      payout_method: f.payout_method || undefined,
      location_label: f.location_label || undefined,
    };
    await run(async () => {
      if (modal.mode === "create") await svc.createPosition(payload);
      else await svc.updatePosition(modal.ref!, payload);
      setModal(null);
    });
  }

  return (
    <ParticipantPage
      title="Position management"
      subtitle="Publish and adjust payout capacity + constraints. Kiwoo sets the customer price — not you."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={res.reload} disabled={res.loading}>Refresh</Button>
          <Button size="sm" onClick={() => { setErrors({}); setModal({ mode: "create", form: { ...EMPTY } }); }} disabled={!online}>New position</Button>
        </div>
      }
    >
      <OfflineBanner online={online} />
      {banner && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{banner}</div>}

      <FeatureGate availability={res.availability} code={res.error?.code} onRetry={res.reload}>
        <Card className="mb-4 border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
          <ul className="list-disc space-y-1 pl-4">
            <li>Kiwoo determines the customer transaction price; your cost input is not the customer fee and does not guarantee selection.</li>
            <li>Accepted quote economics cannot be changed.</li>
            <li>Declared capacity cannot be reduced below locked + fulfilled capacity.</li>
            <li>A position with active locks cannot be closed. Pausing prevents new matching but does not cancel existing obligations.</li>
          </ul>
        </Card>

        {res.loading && positions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">Loading…</Card>
        ) : positions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-400">No positions yet. Create one to declare payout capacity.</Card>
        ) : (
          <div className="space-y-3">
            {positions.map((o) => (
              <PositionRow
                key={o.position_ref}
                o={o}
                busy={busy}
                online={online}
                onEdit={() => { setErrors({}); setModal({ mode: "edit", ref: o.position_ref, form: toForm(o) }); }}
                onAdjust={(kind) => setAdjust({ ref: o.position_ref, kind, amount: "" })}
                onPause={() => setConfirm({ title: "Pause position", message: `Pause ${o.position_ref}? New matching stops; existing obligations are unaffected.`, run: () => run(() => svc.pausePosition(o.position_ref)) })}
                onResume={() => run(() => svc.resumePosition(o.position_ref))}
                onClose={() => setConfirm({ title: "Close position", message: `Close ${o.position_ref}? Only allowed when no capacity is locked.`, run: () => run(() => svc.closePosition(o.position_ref)) })}
              />
            ))}
          </div>
        )}
      </FeatureGate>

      {/* Create / edit modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "New liquidity position" : "Edit position constraints"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</Button>
            <Button onClick={submitForm} loading={busy}>{modal?.mode === "create" ? "Create position" : "Save changes"}</Button>
          </>
        }
      >
        {modal && (
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Currency" name="currency" value={modal.form.currency} error={errors.currency}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, currency: e.target.value } })}
              disabled={modal.mode === "edit"} hint={modal.mode === "edit" ? "Currency is fixed after creation." : undefined} />
            <FormInput label="Declared liquidity" name="declared" value={modal.form.declared_capacity} error={errors.declared_capacity}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, declared_capacity: e.target.value } })}
              disabled={modal.mode === "edit"} hint={modal.mode === "edit" ? "Adjust capacity with Increase / Reduce." : "Total capacity to declare."} inputMode="decimal" />
            <FormInput label="Minimum amount" name="min" value={modal.form.min_amount} error={errors.min_amount}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, min_amount: e.target.value } })} inputMode="decimal" />
            <FormInput label="Maximum amount" name="max" value={modal.form.max_amount} error={errors.max_amount}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, max_amount: e.target.value } })} inputMode="decimal" />
            <FormInput label="Your cost input (bps)" name="bps" value={modal.form.participant_cost_bps} error={errors.participant_cost_bps}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, participant_cost_bps: e.target.value } })}
              hint="Matching provenance only — NOT the customer fee." inputMode="numeric" />
            <FormInput label="Payout method" name="method" value={modal.form.payout_method}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, payout_method: e.target.value } })} placeholder="agent_cash" />
            <FormInput label="Service area" name="area" value={modal.form.location_label}
              onChange={(e) => setModal({ ...modal, form: { ...modal.form, location_label: e.target.value } })} placeholder="Pétionville" className="col-span-2" />
          </div>
        )}
      </Modal>

      {/* Increase / decrease modal */}
      <Modal
        open={!!adjust}
        onClose={() => setAdjust(null)}
        title={adjust?.kind === "increase" ? "Increase declared liquidity" : "Reduce declared liquidity"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjust(null)} disabled={busy}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!adjust) return;
                const amt = Number(adjust.amount);
                if (!Number.isFinite(amt) || amt <= 0) return;
                await run(async () => {
                  if (adjust.kind === "increase") await svc.increasePosition(adjust.ref, adjust.amount);
                  else await svc.decreasePosition(adjust.ref, adjust.amount);
                  setAdjust(null);
                });
              }}
              loading={busy}
            >
              {adjust?.kind === "increase" ? "Increase" : "Reduce"}
            </Button>
          </>
        }
      >
        {adjust && (
          <FormInput
            label="Amount"
            name="amount"
            value={adjust.amount}
            onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })}
            inputMode="decimal"
            hint={adjust.kind === "decrease" ? "Cannot reduce below locked + fulfilled capacity (backend-enforced)." : undefined}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        onConfirm={async () => { const r = confirm?.run; setConfirm(null); if (r) await r(); }}
        onCancel={() => setConfirm(null)}
      />
    </ParticipantPage>
  );
}

function toForm(o: PositionView): PositionForm {
  return {
    currency: o.currency,
    declared_capacity: o.declared_capacity,
    min_amount: o.min_amount,
    max_amount: o.max_amount,
    participant_cost_bps: String(o.participant_cost_bps ?? ""),
    payout_method: o.payout_method ?? "",
    location_label: o.location_label ?? "",
  };
}

function PositionRow({
  o, busy, online, onEdit, onAdjust, onPause, onResume, onClose,
}: {
  o: PositionView;
  busy: boolean;
  online: boolean;
  onEdit: () => void;
  onAdjust: (kind: "increase" | "decrease") => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
}) {
  const withdrawn = o.status === "WITHDRAWN";
  const disabled = busy || !online || withdrawn;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-ink-500">{o.position_ref}</div>
          <div className="text-sm font-medium text-ink-900">
            {formatMoney(o.declared_capacity, o.currency)} declared ·{" "}
            <span className="text-ink-500">{formatMoney(o.available_capacity, o.currency)} available · {o.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit} disabled={disabled}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => onAdjust("increase")} disabled={disabled}>Increase</Button>
          <Button size="sm" variant="secondary" onClick={() => onAdjust("decrease")} disabled={disabled}>Reduce</Button>
          {o.status === "ACTIVE" ? (
            <Button size="sm" variant="secondary" onClick={onPause} disabled={disabled}>Pause</Button>
          ) : o.status === "PAUSED" ? (
            <Button size="sm" variant="secondary" onClick={onResume} disabled={disabled}>Resume</Button>
          ) : null}
          <Button size="sm" variant="danger" onClick={onClose} disabled={disabled}>Close</Button>
        </div>
      </div>
    </Card>
  );
}
