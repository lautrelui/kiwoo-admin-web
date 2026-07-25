# Marketplace M4A-2 — Corp/LEH Participant Interface

**Status:** built + dark-deployed to TEST. `MARKETPLACE_PARTICIPANT_ENABLED=false` (fail-closed) →
every write route returns **503**. No financial execution, payout, reserve, settlement, or compensation.
Kiwoo remains the sole authority for customer pricing, matching, settlement eligibility, and accounting.

This document is the discovery output, architecture note, permission matrix, concept + SOP guides,
state-to-screen matrix, API contract, offline/stale note, dark-deploy runbook, rollback procedure,
API/DTO gaps, and M4A-3 prerequisites for the participant interface.

---

## 1. Discovery (as-found)

- **Repo:** `kiwoo_admin_web` (React 18 + Vite + TypeScript + react-router v6 + axios + tailwind).
  Git home `lautrelui/kiwoo-admin-web`, `main` @ `2acfeb4`. Served as an nginx image
  (`kiwoo-admin-web:latest`) at `admin.kiwoo.io` behind Traefik; source at `/Data/kiwoo-prod/admin/`.
- **Auth/roles:** `AuthContext` + `useAuth().hasRole(...)`; `ProtectedRoute roles={[...]}`. `Role` was
  operator-only (`ADMIN/SUPER_ADMIN/TREASURY/COMPLIANCE/VIEWER`). No participant tenancy existed — the
  admin app was operator-only. **Decision:** add participant roles + a tenancy-separated nav section.
- **API client:** `src/lib/api.ts` axios instance (Bearer from `localStorage`, 401→/login). Backend
  wraps responses as `{ statusCode, message[], data }` (`successWrapper`) → services unwrap `.data.data`.
- **Design system:** `components/ui/*` (Button, Card, StatCard, DataTable, Modal, ConfirmDialog,
  FormInput/Select/Textarea, StatusBadge) — reused, no new visual system.
- **Backend:** the participant API already exists (`participant/marketplace/*`, `JwtGuard`, gated by
  `MARKETPLACE_PARTICIPANT_ENABLED`, server-side identity = `user.id`). Client-safe projections
  `OfferView` / `ObligationView` / `ParticipantReceiptDto` / evidence trail already strip PII + ledger ids.

## 2. Files added / changed

**Frontend (`kiwoo_admin_web`)**
- `src/types/marketplace.ts` — typed DTOs + `MarketplaceState` + safe parsers (unknown → UNKNOWN).
- `src/services/marketplaceParticipantService.ts` — canonical participant API client + `marketplaceError`.
- `src/lib/marketplace.ts` — state→screen map, money format (no float reparse), reason codes, concepts.
- `src/lib/marketplaceHooks.ts` — `useAsyncResource` (503→disabled), `useOnline`, `useLifecycleRefresh`.
- `src/lib/roles.ts` — participant/operator role sets.
- `src/lib/marketplaceFixtures.ts` — deterministic fixtures for every state (never hit endpoints).
- `src/components/marketplace/atoms.tsx` — TestNotice, EnvTestBanner, ParticipantPage, StateBadge,
  MoneyBreakdown, LiquidityConcepts, OfflineBanner, FeatureGate.
- `src/components/marketplace/CredentialInput.tsx` — secure one-time credential validation.
- `src/pages/marketplace/{Overview,Liquidity,Offers,Obligations,ObligationDetail,Disputes,Earnings,Activity}.tsx`.
- `src/components/layout/Sidebar.tsx` — participant section + tenancy filter.
- `src/routes/routes.tsx` — 8 participant routes (role-guarded). `src/types/index.ts` — Role union.
- `src/test/marketplace/*` — unit/component/security/integration tests; `vitest.config.ts` + setup.

**Backend (`kiwoo_backend-main`, additive, gated)**
- `marketplace-dtos.ts` — `ParticipantOverviewDto` (allowlisted aggregates).
- `marketplace-participant.service.ts` — `overview()` (server-aggregated) + `listObligations(scope)`.
- `participant-marketplace.controller.ts` — `GET overview`; `GET fulfilments?scope=active|all`.
- tests: gating spec (overview → 503), M3 disposable-PG overview aggregation, empty→zeros.

## 3. Role & tenancy (permission matrix)

Participant identity is **always** resolved server-side from the JWT; the frontend never sends a
participant id as an authority-bearing field. Route/nav roles gate UX only.

| Surface | Operator (`ADMIN/…`) | Participant (`PARTICIPANT/CORP/LEH/MERCHANT_PARTICIPANT`) |
|---|---|---|
| Operator + Ops pages | ✅ | ❌ (hidden; backend AdminGuard also blocks) |
| Marketplace (Participant) nav + routes | ❌ (hidden) | ✅ |
| Own offers / obligations / entitlement / disputes | — | ✅ (server ownership-checked) |
| Another participant's data, matching candidates, operator notes, customer KYC/ledger | ❌ | ❌ |

A **pure** participant (participant role, no operator role) sees ONLY the participant section; an
operator never sees it; a user with both sees both. Ownership errors (403) map to a safe "no access".

## 4. Liquidity concepts (kept distinct — never merged into one balance)

Kiwoo wallet balance · **Declared** physical liquidity · **Available** (declared−locked−fulfilled) ·
**Locked** (committed to accepted/pending) · **Fulfilled** (handed over, awaiting accounting) ·
**Principal advanced** (cash paid to customer) · **Participant compensation** (separate Kiwoo-funded
earning) · **Total entitlement** (principal + compensation). Rendered with the prominent notice:
"Declared liquidity … is **not** your Kiwoo wallet balance."

## 5. Offer-management guide

Create / edit constraints / increase / reduce / pause / resume / close. The UI states: Kiwoo sets the
customer price (participant cost input ≠ customer fee, ≠ guaranteed selection); accepted quote economics
are immutable; declared cannot drop below locked+fulfilled; an offer with active locks can't be closed;
pausing stops new matching but not existing obligations. Client validation is usability-only; backend
messages are shown verbatim.

## 6. Obligation lifecycle (state → screen matrix)

| State group | States | Screen / action |
|---|---|---|
| pending | `PARTICIPANT_ACCEPTANCE_PENDING` (+PENDING/LOCKED) | Accept (forced refresh) / Reject (reason) + countdown |
| accepted | `PARTICIPANT_ACCEPTED` | "Credential being issued" (info) |
| ready | `READY_FOR_COLLECTION`, `COLLECTION_CREDENTIAL_VERIFIED`, `READY_FOR_HANDOVER` | Validate credential (READY) → then Confirm handover (VERIFIED) |
| awaiting | `HANDOVER_CONFIRMED`, `PARTICIPANT_HANDOVER_CONFIRMED`, `CUSTOMER_RECEIPT_PENDING` | Awaiting customer + Dispute |
| settled | `CUSTOMER_RECEIPT_CONFIRMED`, `EVIDENCE_SUFFICIENT`, `CONFIRMED`, `SETTLED` | Receipt |
| review | `CUSTOMER_RECEIPT_DENIED`, `CUSTOMER_CONFIRMATION_TIMEOUT`, `MANUAL_REVIEW_REQUIRED`, `DISPUTED`, `NEEDS_RECONCILIATION` | Under review |
| closed | `PARTICIPANT_REJECTED`, `PARTICIPANT_ACCEPTANCE_TIMEOUT`, `EXPIRED`, `COMPENSATED` | Closed / compensated receipt |
| unknown | any unrecognised state | Generic "status unavailable" + refresh (NO action offered) |

## 7. Credential-validation SOP (security)

Validation is a **separate** action from handover. The one-time code / opaque QR token live only in
component memory — never `localStorage`/`SharedPreferences`/`SQLite`/durable cache, never a URL, never
analytics or logs. Fields **clear after submission**; duplicate submit is guarded; nothing is decoded or
derived from the QR (opaque token passed straight to the backend, which binds fulfilment/participant/
amount). Distinct handling for invalid / expired / already-used / wrong-participant / amount-mismatch.
Success → "Credential verified **does not** mean cash has been handed over."

## 8. Cash-handover SOP

Immediately before the handover dialog opens, a **forced server refresh** runs and the client re-checks:
still owned (403 → blocked), still credential-verified / ready-for-handover, not expired/cancelled/
completed, not in dispute/review, amount unchanged, handover not already recorded. Any failure blocks and
shows the current backend state (no fallback transition). The dialog shows the exact amount, customer-safe
alias, an irreversibility warning, and requires a deliberate second confirmation checkbox — "I confirm
that I physically handed the full cash amount shown above to the customer." Handover ≠ acceptance ≠ QR
scan ≠ code validation ≠ navigation ≠ timeout. The backend remains the final authority.

## 9. Participant dispute guide

Opened from an obligation's detail with a required reason (curated list) + explicit confirmation +
forced refresh + duplicate-submit guard. The UI states: the case enters manual review; settlement and
compensation may be frozen; the participant cannot choose the final financial outcome; Kiwoo operator
adjudication is final per policy. No custom settlement/compensation amounts.

## 10. Principal vs compensation (108-HTGe example)

Customer total debit **108 HTGe** → participant **principal 100** + **compensation 3** = **entitlement
103**. Kiwoo: fee revenue 5, participant-compensation expense 3, net fee 2; tax payable 2; regulatory
fee payable 1. The UI never implies the 3 is deducted from the 100, that compensation is part of declared
liquidity, or that entitlement is a wallet balance. `MoneyBreakdown` renders the three as distinct rows.

## 11. Offline & stale-state handling

`useOnline()` blocks all offer mutations / accept / reject / validate / handover / dispute while offline
(read-only display of already-loaded data only; nothing is queued). `useLifecycleRefresh()` re-fetches on
window focus / tab restore / reconnect. Financial actions require a live server response; optimistic
assumptions are replaced by server state before any action is enabled.

## 12. API contract (participant, consumed)

`GET overview` · `GET liquidity-offers` · `POST liquidity-offers` · `PATCH liquidity-offers/:ref` ·
`POST liquidity-offers/:ref/{increase,decrease,pause,resume,close}` · `GET fulfilments?scope=active|all`
· `GET fulfilments/:ref` · `POST fulfilments/:ref/{accept,reject,validate-code,confirm-handover,dispute}`
· `GET fulfilments/:ref/evidence` · `GET fulfilments/:ref/receipt`. All gated (503 while dark), server
identity only, allowlisted DTOs.

## 13. Analytics & logging

No analytics SDK is wired in the admin app; the participant surface adds none. The credential code / QR
token / any secret are never logged or sent anywhere. (When analytics is later added, use bounded
event/result names only — see the spec's allowlist.)

## 14. Dark-deployment runbook

1. `npm run test` (vitest) + `npx tsc --noEmit` green.
2. `npm run build` → `dist/` (immutable content-hashed assets).
3. Back up current `/Data/kiwoo-prod/admin/` source + record the running image id.
4. rsync the repo to `/Data/kiwoo-prod/admin/` (excluding node_modules/dist/.git).
5. `docker compose build kiwoo-admin-web` with an immutable tag; record the image digest/id.
6. `docker compose up -d kiwoo-admin-web`. Keep all three marketplace flags = false; `LIQUIDITY_ENABLED`
   off; MonCash unchanged.
7. Verify `admin.kiwoo.io` 200 + bundle contains M4A-2 strings; run dark smoke (below).

## 15. Dark smoke

Participant login works; participant nav loads per dark-read policy; TEST notice renders; zero-row states
render; every write (create/edit/pause/resume/close, accept/reject, validate, handover, dispute) is
backend-blocked (503); no offer/lock/fulfilment/evidence/settlement/compensation/journal created; no
browser-storage secret; existing admin pages functional; MonCash unchanged.

## 16. Rollback

Restore the backed-up `/Data/kiwoo-prod/admin/` source + re-tag the previous image as `:latest` and
`docker compose up -d kiwoo-admin-web` (or point compose back at the previous image id). No DB change —
backend is additive + gated; the frontend is static.

## 17. Unresolved API / DTO gaps

- **Liquidity change history** — no participant-safe per-offer history endpoint exists; the Liquidity page
  shows nothing there rather than fabricate events. (Would need `GET liquidity-offers/:ref/history`.)
- **Server-config reason codes** — reject/dispute reasons are a curated client list; the backend accepts a
  free-form `reason_code`. A `GET reasons` config endpoint would remove the client list.
- **Activity feed** — composed client-side from `fulfilments?scope=all` + per-obligation evidence trails,
  bounded to the most recent 25 obligations (truncation disclosed). A dedicated participant activity
  projection would remove the fan-out + cap.
- **QR camera scanner** — the opaque `qr_token` is entered/pasted; a native camera-decode integration is a
  follow-up. Manual entry is always available (accessibility).
- **Participant role provisioning** — the backend has no dedicated participant role today (endpoints use
  `JwtGuard` + `user.id`). Real participant logins + a `PARTICIPANT` role claim are a provisioning
  prerequisite before enabling the flag.

## 18. M4A-3 (Operator adjudication console) — prerequisites (NOT authorized)

Operator backend already exists (`operator-marketplace.controller.ts`: reviews / context / note /
adjudicate, gated by `MARKETPLACE_OPERATOR_ENABLED`). M4A-3 would add the operator adjudication console
(review queue, evidence-complete context, note, SETTLE/COMPENSATE adjudication with four-eyes where
applicable) in the operator app — a **separate** authorization. It must NOT be a NOC dashboard (that's
M4A-4) and must keep operator-only data (matching candidates, notes, ledger) off participant surfaces.
