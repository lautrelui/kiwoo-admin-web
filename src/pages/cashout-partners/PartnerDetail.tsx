import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cashoutPartnerService as svc } from "@/services/cashoutPartnerService";
import type { PartnerDirectoryItem } from "@/types/cashoutPartner";

export default function PartnerDetail() {
  const { id } = useParams();
  const partnerId = Number(id);
  const navigate = useNavigate();
  const [p, setP] = useState<PartnerDirectoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setP(await svc.getPartner(partnerId)); }
      catch (err) { setError(apiErrorMessage(err)); }
      setLoading(false);
    })();
  }, [partnerId]);

  return (
    <AppLayout title="Partner" subtitle={p ? p.display_name || p.user.name || `User ${p.user_id}` : "Loading…"}>
      <button onClick={() => navigate("/cashout-partners/directory")} className="mb-4 text-sm text-brand-600 hover:underline">
        ← Back to partners
      </button>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && !p ? (
        <div className="text-ink-400">Loading…</div>
      ) : p ? (
        <>
          <div className="mb-4 flex items-center gap-3">
            <StatusBadge status={p.status} />
            <span className="text-xs text-ink-400">Availability (partner-controlled):</span>
            <StatusBadge status={p.availability} />
          </div>

          {/* P0 · The four DISTINCT readiness facts — onboarding status alone never means customer-ready. */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReadyFact ok={p.readiness?.business_active ?? (p.status === "MARKETPLACE_ACTIVE")}
              label="Business Active" hint="Onboarding complete and approved to operate when the Marketplace rail is enabled." />
            <ReadyFact ok={p.readiness?.discoverable ?? false}
              label="Discoverable" hint="The partner can currently be considered by customer matching." />
            <ReadyFact ok={p.readiness?.executable ?? false}
              label="Executable" hint="A matched customer transaction can currently proceed through reservation and completion." />
            <ReadyFact ok={p.availability === "AVAILABLE"} neutral
              label="Available" hint="The partner's own declared open/closed preference (operational, not readiness)." />
          </div>

          {!p.stats.marketplace_activity && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No Marketplace activity yet — execution is not enabled, so request/payout/dispute statistics are zero.
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Completed payouts" value={`${p.stats.completed_payouts} HTG`} />
            <StatCard label="Completed requests" value={p.stats.completed_requests} />
            <StatCard label="Acceptance rate" value={p.stats.acceptance_rate == null ? "—" : `${p.stats.acceptance_rate}%`} />
            <StatCard label="Avg response" value={p.stats.avg_response_time_seconds == null ? "—" : `${p.stats.avg_response_time_seconds}s`} />
            <StatCard label="Current requests" value={p.stats.current_requests} />
            <StatCard label="Customer confirmations" value={p.stats.customer_confirmations} />
            <StatCard label="Customer disputes" value={p.stats.customer_disputes} />
            <StatCard label="Open risk flags" value={p.compliance.open_risk_flags} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <F label="Display name" v={p.display_name} />
                  <F label="Business" v={p.business_name} />
                  <F label="Wallet ID" v={p.user.wallet_id} mono />
                  <F label="Phone" v={p.contact_phone || p.user.phone} />
                  <F label="Email" v={p.user.email} />
                  <F label="Languages" v={p.languages.join(", ")} />
                  <F label="KYC" v={p.compliance.kyc_tier} />
                  <F label="Standing" v={p.compliance.account_standing} />
                </dl>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><CardTitle>Operating schedule & capacity</CardTitle></CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <F label="Operating area" v={[p.neighborhood, p.operating_city].filter(Boolean).join(", ")} />
                  <F label="Operating days" v={p.operating_days.join(", ")} />
                  <F label="Hours" v={p.operating_hours_start ? `${p.operating_hours_start} – ${p.operating_hours_end || ""}` : null} />
                  <F label="Emergency unavailable" v={p.emergency_unavailable ? "Yes" : "No"} />
                  <F label="Online now" v={p.is_online ? "Yes" : "No"} />
                  <F label="Typical cash" v={p.typical_cash_available ? `${p.typical_cash_available} HTG` : null} />
                  <F label="Payout range" v={p.min_payout ? `${p.min_payout} – ${p.max_payout || ""} HTG` : null} />
                  <F label="Activated" v={p.activated_at ? formatDateTime(p.activated_at) : null} />
                </dl>
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </AppLayout>
  );
}

function F({ label, v, mono }: { label: string; v?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-ink-800 break-all" : "text-ink-800"}>{v || "—"}</dd>
    </div>
  );
}

/** P0 · One readiness fact with a Yes/No pill and an explanatory tooltip. `neutral` = an operational
 *  preference (Availability) rather than a readiness gate. */
function ReadyFact({ ok, label, hint, neutral }: { ok: boolean; label: string; hint: string; neutral?: boolean }) {
  const onColor = neutral ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700";
  const onDot = neutral ? "bg-sky-500" : "bg-emerald-500";
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2" title={hint}>
      <div className="text-xs uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1">
        <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " + (ok ? onColor : "bg-slate-100 text-slate-500")}>
          <span className={"h-1.5 w-1.5 rounded-full " + (ok ? onDot : "bg-slate-400")} />
          {ok ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}
