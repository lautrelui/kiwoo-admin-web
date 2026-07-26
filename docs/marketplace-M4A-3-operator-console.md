# Marketplace M4A-3 — Operator Adjudication Console

**Status:** built + dark-deployed to TEST. `MARKETPLACE_OPERATOR_ENABLED=false` (fail-closed) → every
operator route returns **503**. No adjudication, settlement, or compensation performed. The backend is
the sole authority for eligibility, amounts, accounts, participant/customer identity, journal
construction, and the terminal transition.

This is the discovery/architecture note, role matrix, review-reason vocabulary, evidence definitions,
adjudication + SETTLE/COMPENSATE SOPs, four-eyes policy + maker-checker workflow, operator-note policy,
state-to-screen matrix, operator API contract, privacy matrix, offline/stale note, dark-deploy runbook,
rollback, API gaps, and M4A-4 prerequisites.

## 1. Architecture

- **Repo:** `kiwoo_admin_web`. The operator console is a section of the SAME admin app (no separate app).
  Operator-only (`ADMIN`/`SUPER_ADMIN`/`COMPLIANCE`); participants never see it; the backend also gates
  on `MARKETPLACE_OPERATOR_ENABLED` + role.
- **Two screens:** a bounded **Review Queue** (7 nav presets → server filters) and a **Case Detail**
  (17 sections + four-eyes adjudication). Reuses the M4A-2 atoms (TestNotice, FeatureGate, MoneyBreakdown,
  StateBadge, OfflineBanner, ParticipantPage chrome) + hooks (useAsyncResource/useOnline/useLifecycleRefresh).
- **Backend gap closed (four-eyes):** the prior operator surface was single-operator + note-as-review.
  M4A-3 adds `MarketplaceAdjudicationProposal` (maker-checker), a versioned policy, an adjudication
  preview, immutable notes, a paginated/filtered queue, and operator-safe 17-section context.

## 2. Files

**Frontend:** `src/types/marketplaceOperator.ts`, `src/services/marketplaceOperatorService.ts`,
`src/lib/marketplaceOperator.ts`, `src/lib/marketplaceOperatorFixtures.ts`,
`src/pages/marketplace/operator/{ReviewQueue,CaseDetail}.tsx`, Sidebar operator section, 8 routes,
`src/lib/roles.ts` (`MARKETPLACE_OPERATOR_ROLES`), `src/test/marketplace/operator-*.test.*`.

**Backend (additive, gated):** `MarketplaceAdjudicationProposal` model + migration
`20260725210000_marketplace_operator_four_eyes` + `scripts/rc2/marketplace-m4a3-constraints.sql`
(partial unique index); `marketplace-adjudication.service.ts`, `marketplace-operator-dtos.ts`;
rewritten `marketplace-operator.service.ts` + `operator-marketplace.controller.ts`; module + gating +
constants; `marketplace-m4a3.integration.spec.ts`.

## 3. Role & authorization matrix

Operator identity is ALWAYS server-resolved from the JWT; the client never sends operator/participant/
customer id, amount, account, or settlement state as an authority-bearing field.

| Surface | Operator (`ADMIN/SUPER_ADMIN/COMPLIANCE`) | `VIEWER`/other operator | Participant | Customer |
|---|---|---|---|---|
| Operator Marketplace nav + routes | ✅ | ❌ | ❌ | ❌ |
| Case context / preview | ✅ | ❌ | ❌ | ❌ |
| Note / propose / approve / reject | ✅ (backend-gated) | ❌ | ❌ | ❌ |
| Operator notes visibility | ✅ | — | ❌ (never on participant DTO) | ❌ (never on customer DTO) |

## 4. Review-reason vocabulary

`DISPUTE` (party dispute) · `MANUAL_REVIEW_REQUIRED` · `CUSTOMER_DENIES_RECEIPT` ·
`CUSTOMER_CONFIRMATION_TIMEOUT` · `ROUTINE_CHECK` (+ raw code shown if unrecognised). Presets: all,
disputes, timeouts, conflicts (reason≈CONFLICT), reconciliation (reason≈RECON), awaiting-approval
(four-eyes PENDING, page-filtered), adjudicated.

## 5. Evidence panel definitions

Credential (issued / verified / verified-at / single-use / expired), Handover (exists / confirmed-at /
amount-binding — distinct from credential + receipt), Customer receipt (confirmed / denied / timed-out).
Never exposes raw code / Argon2 hash / QR payload / device+session hashes / metadata.

## 6. Adjudication SOP (four-eyes)

1. Open the case; review the 17 sections. 2. Add immutable notes as needed. 3. Choose SETTLE/COMPENSATE
+ a reason + a mandatory note → **Preview impact** (forced refresh first). 4. Tick the explicit
final-confirmation checkbox → **Propose**. 5. If policy permits a single approval, the decision is final
now; otherwise a PENDING proposal is created and a **different** operator must **Approve** (same forced
refresh + preview + checkbox). The maker can never approve their own proposal (backend-enforced). Reject
returns the case to review with no money moved.

## 7. SETTLE impact

Customer reserve consumed · participant principal + compensation credited · Kiwoo fee recognized · tax +
regulatory-fee liabilities posted · liquidity lock consumed · compensation becomes impossible · final.
Amounts come from the immutable snapshot (108 debit → 100 principal + 3 comp = 103 entitlement).

## 8. COMPENSATE impact

Customer reserve returned · eligible unused lock released where safe · participant principal +
compensation NOT credited · settlement becomes impossible · final. If handover evidence exists the
backend REJECTS compensation and the preview surfaces `compensation_prohibited (handover_evidence_exists)`.

## 9. Four-eyes policy (versioned, v1)

Second approval is required when the payout is **at/above `MARKETPLACE_FOUR_EYES_THRESHOLD`** (default `0`
⇒ every case), OR the case involves an **evidence conflict**, **reconciliation inconsistency**, or a
**party dispute**. Below-threshold routine/reconciler cases with no dispute are single-approval-permitted.
Only the policy OUTCOME is exposed (single-permitted / second-required / pending / approved / rejected)
with a bounded reason list + policy version. No invisible frontend thresholds.

## 10. Maker-checker workflow

Propose records `proposed_by` + reason + note + policy version (immutable). Approve is a single-winner
conditional claim (`PENDING→APPROVED`), forbids self-approval, forces a refresh, then runs the canonical
`dispute.adjudicate` (settle/compensate). At most one PENDING proposal per fulfilment (partial unique
index). Reject/withdraw is single-winner and moves no money. Final financial action is 100% backend.

## 11. Operator-note policy

Append-only; category + mandatory text + client idempotency key (dedups double-submit); server-resolved
operator id + timestamp. No edit/delete. Sanitized (stored via the evidence allowlist; text capped 128 —
see gaps). Never surfaced on customer/participant routes.

## 12. State-to-screen matrix

Queue (7 presets) → case detail. Case detail adapts: terminal (`COMPLETED`/`COMPENSATED` or a recorded
outcome) → read-only Final Outcome; four-eyes `SECOND_APPROVAL_PENDING` → Approve/Reject panel; otherwise
→ Propose panel. Unknown/absent context → "case not found"/feature-disabled.

## 13. Operator API contract

`GET reviews?{reason,state,origin,participant,from,to,adjudication,limit,offset}` ·
`GET reviews/:ref` · `GET reviews/:ref/preview?decision=SETTLE|COMPENSATE` ·
`POST reviews/:ref/note {category,note,idempotency_key}` · `POST reviews/:ref/propose {decision,reason,note}`
· `POST proposals/:id/approve {resolution_note?}` · `POST proposals/:id/reject {resolution_note?}` ·
(legacy `POST reviews/:ref/adjudicate`). All gated 503; operator identity server-side.

## 14. Privacy projection matrix

Operator DTOs exclude: raw OTP / collection code / QR payload / Argon2 hash / device+session hashes /
ledger accounts / raw journal ids (journal presence = boolean) / arbitrary metadata / full KYC /
unrelated history. Participant + customer DTOs exclude operator notes + operator-only fields. Verified by
the DTO/fixture forbidden-field tests + the disposable-PG context test.

## 15. Offline & stale-state

Offline blocks note/propose/approve/reject (nothing queued; read-only display). Focus/visibility/reconnect
re-fetch. A forced server refresh runs before the impact preview and before each decision; the backend is
the final concurrency authority (one-winner claims + terminal guards).

## 16. Dark-deployment runbook

1. Backend: `npx tsc --noEmit` + disposable-PG chaos gate (`scripts/rc2/chaos.sh`) green. 2. Tag +
CI `build-operational-images.yml` → immutable digest. 3. Back up compose+.env; apply the additive
migration (`prisma migrate deploy`); pin the digest; `docker compose up -d kiwoo-backend`. 4. Frontend:
`npm run test` + `tsc` + `vite build`; rsync source; `docker build` immutable tag; `docker compose up -d
kiwoo-admin-web`. 5. Keep all three marketplace flags = false; `LIQUIDITY_ENABLED` off; MonCash unchanged.
6. Verify versions + dark smoke.

## 17. Dark smoke

Admin login; operator nav renders for an authorized operator; a pure participant does NOT see it; queue
empty-state renders; TEST notice behaviour; operator routes backend-gated; note/propose/approve/reject +
direct writes blocked; no reserve/lock/fulfilment/evidence/settlement/compensation/journal; participant +
wallet apps unchanged; MonCash callback unchanged; no operator secret/note in browser storage.

## 18. Rollback

Frontend: re-tag the previous admin image + `up -d kiwoo-admin-web`. Backend: re-pin the previous digest
+ `up -d kiwoo-backend`. The migration is additive (new table only) — safe to leave; to fully revert,
`DROP TABLE "MarketplaceAdjudicationProposal"` + the two enums (no other table references it).

## 19. Unresolved API/DTO gaps

- **Operator note text capped at 128 chars** (reuses the evidence metadata allowlist). A dedicated note
  column/table would remove the cap.
- **Adjudication reason codes + note categories are curated client lists** (backend accepts free-form).
- **Evidence-policy verdict is a coarse state-derived mapping** in the operator context (the live policy
  engine verdict is not recomputed on read).
- **Assignment/claiming not implemented** (documented non-blocking; queue shows `assigned_operator: null`).
- **SLA / second-approval / assignment filters** on the queue are partly client-side on the page; the
  primary server-backed filters are reason/state/origin/participant/date/adjudication + pagination.
- **"Operator Activity" nav item** folded into Adjudicated + per-case timeline (not a separate page).

## 20. M4A-4 (Marketplace Operations Dashboard) — prerequisites (NOT authorized)

The operations read-model backend already exists (`operations-marketplace.controller.ts`: summary /
funnel / sla / participants / alerts / timeline, gated by `MARKETPLACE_OPERATOR_ENABLED`). M4A-4 would
build the **NOC/operations dashboard** (fleet metrics, funnels, SLA analytics, participant health, alerts)
consuming those projections — a **separate** authorization. It must NOT include adjudication (that's this
console) and must expose no operator-private notes or customer/participant PII. Also needs the public
nginx `/operations/*` proxy route (noted since M4A ops backend).
