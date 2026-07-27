# Marketplace M4A-4 — Operations Dashboard ("Control Tower")

**Status:** built + dark-deployed to TEST. `MARKETPLACE_OPERATOR_ENABLED=false` (fail-closed) → every
operations route returns **503**. READ-ONLY supervision; the dashboard posts nothing and moves no money.
The backend is authoritative for every figure (no client recomputation).

## 1. Architecture

- **Repo:** `kiwoo_admin_web`. One operator-only page (`/control-tower/marketplace`, roles
  ADMIN/SUPER_ADMIN/COMPLIANCE) consuming the gated `operations/marketplace/*` read-model. Reuses the
  M4A-2/3 atoms (FeatureGate/OfflineBanner/TestNotice/ParticipantPage) + hooks. Charts via `recharts`.
- **Load order:** the summary loads first; every widget (funnel, liquidity, participant health, SLA,
  alerts, timeline, trends, search) loads independently/async with its own loading + empty state.
- **Nginx / ingress:** `operations/marketplace/*` on `api.kiwoo.io` already reaches the backend through
  Traefik (Host-based) and is gated there (JwtGuard + `MARKETPLACE_OPERATOR_ENABLED` → 401 unauth / 503
  flag-off). No separate edge allowlist was added — the backend gating is authoritative and adding a
  path-allowlist to the shared money-API ingress would be risky/out-of-scope (documented as optional
  infra hardening).

## 2. Files

**Frontend:** `src/types/marketplaceOps.ts`, `src/services/marketplaceOpsService.ts`,
`src/lib/{marketplaceOps,marketplaceOpsFixtures}.ts`, `src/pages/marketplace/ops/Dashboard.tsx`,
Sidebar "Control Tower" entry, route, `src/test/marketplace/ops-*.test.*`.

**Backend (additive, gated, NO migration):** `marketplace-operations.service.ts` (+ liquidity / global
timeline / search / trends + summary today-counts + active_alerts) + controller routes; gating +
operations disposable-PG spec extended.

## 3. Backend read surface (all gated 503 dark, dark-safe zeros)

`GET operations/marketplace/{summary,funnel,sla,participants,alerts,payments/:ref/timeline}` (existing) +
`GET .../liquidity` (fleet + by service-area/currency/offer-status) + `GET .../timeline` (global feed) +
`GET .../search` (bounded fulfilment search) + `GET .../trends?metric&bucket&days` (quotes/settlements/
compensations/disputes by hour/day/week). summary adds `completed_settlements_today`,
`completed_compensations_today`, `active_alerts`.

## 4–15. Dashboard implementation (maps to the spec sections)

- **Overview KPIs** — 16 cards from `summary` (participants, offers, declared/available/locked/fulfilled
  liquidity, pending acceptance, ready, awaiting, manual reviews, open disputes, pending compensations,
  completed today, active alerts, completed all-time). Actionable KPIs drill into the operator console.
- **Funnel** — `funnel` → recharts bars + per-step count / conversion% / drop-off% (empty-safe: conversion
  is null when the prior step is 0 — no divide-by-zero/NaN).
- **Liquidity** — `liquidity` totals + by-service-area table (low-liquidity zones flagged, available ≤ 0) +
  by-currency + by-status. (Participant-type breakdown omitted — not modelled; documented.)
- **Participant health** — paginated `participants` table with RAW metrics (available, active, accepted,
  rejected, timeouts, disputes, settled) — no opaque scoring.
- **SLA** — `sla` rows classified GREEN/WARNING/BREACHED (text status, not colour-only).
- **Alerts** — `alerts` list with client severity (critical/warning/info), reason, age, recommended
  action, deterministic-repair / human-review flags; each row deep-links to the operator case.
- **Realtime timeline** — global `timeline` feed (event · actor · reference), privacy-safe.
- **Drill-down** — KPI cards + alert/search rows link to the operator console (queue presets / case);
  the on-page widgets are themselves the underlying filtered data.
- **Charts** — recharts funnel bars + trends line (metric × hour/day/week selectors).
- **Filters/Search** — the Search widget queries `search` by reference + state (extensible to
  participant/city/date server-side); rows deep-link to the case.

## 16. Empty state

Zero Marketplace rows render an intentional dashboard — every widget shows a purposeful empty message,
funnel conversion is null (never NaN), no divide-by-zero, no lorem ipsum. Proven by the empty-state test.

## 17. Performance / privacy / observability

Summary-first; widgets async; tables server-paginated + bounded. Consumes the ops APIs only (no client
recomputation of authoritative values). Never renders customer PII / OTP / QR / collection code / ledger
ids / journal ids / operator notes / raw metadata (backend already strips; fixtures + parsers assert it).

## 18. Tests

Vitest: ops-service (read-only routes + envelope + params), ops-dashboard (unit empty-safe funnel/SLA/
severity/parse defaults, privacy, component render, empty-state no-NaN, 503 feature-disabled, drill-down
links, participant pagination). 69 total green; tsc clean; vite build clean. Backend chaos 95/95 (ops
spec extended: liquidity/timeline/search/trends well-formed + privacy-safe).

## 19. Dark-deployment runbook

Backend: `tsc` + chaos gate → CI immutable image (NO migration) → pin digest → `up -d kiwoo-backend`.
Frontend: `npm run test` + `tsc` + `vite build` → rsync → `docker build` immutable tag → `up -d
kiwoo-admin-web`. Keep all marketplace + `LIQUIDITY_ENABLED` flags OFF; MonCash unchanged.

## 20. Dark smoke

Admin 200 + Control Tower literals; backend health 200; `operations/marketplace/*` reachable + gated
(401 unauth / 503 flag-off); dashboard loads with zero rows (empty-state); MonCash callback 403; wallet /
participant / operator apps unchanged; marketplace rows 0; `JournalEntry` unchanged; no financial row.

## 21. Rollback

Frontend: re-tag previous admin image + `up -d`. Backend: re-pin previous digest + `up -d` (no migration
to revert — read-only additions only).

## 22. Unresolved gaps / remaining before M4B

- Liquidity/SLA **historical** trends need periodic snapshots (only volume/settlement/compensation/dispute
  trends are timestamp-derivable today) — documented; a snapshotter is future work.
- Participant-**type** breakdown not modelled (participants are User ids).
- Optional edge path-allowlist for `/operations/*` (backend gating is authoritative today).
- Maps (optional in the spec) not implemented — service-area breakdown table substitutes.
- Full accessibility audit + visual/golden validation is **M4B** (not authorized).

## 23. M4B (validation) — what it would cover (NOT authorized)

End-to-end visual/state validation across all four surfaces (wallet, participant, operator, dashboard),
full accessibility audit, golden/Playwright coverage, and the flag-on canary rehearsal — a separate
authorization after all M4A surfaces are built (they now are).

---

## 24. Deploy record (dark, TEST — 2026-07-26)

- **Frontend:** admin commit `497d671` on `feat/marketplace-m4a4-ops-dashboard` (`lautrelui/kiwoo-admin-web`).
  Built on host → image `kiwoo-admin-web:m4a4-497d671` (manifest
  `sha256:cf17d5edebabca55d37476de8d134b6e5a4cf16d63055f367f85f8eb6c4df70d`); `docker compose up -d
  kiwoo-admin-web`. `admin.kiwoo.io` → 200; bundle `index-C51z9KaI.js` has the Control Tower literals.
  Rollback: prev image `sha256:e113ce07…` + `backups/admin-{image,src}-pre-m4a4-20260726T044717Z.*`.
- **Backend:** commit `bcb1bf5` (tag `v1.0.0-rc2-marketplace-m4a4`), CI run `30188327603` (test+chaos 95/95+build ✓),
  immutable image `ghcr.io/lautrelui/kiwoo-backend@sha256:af6de423f481f2aff7b0ab16b0583b1ee93ae0b2da1d9d2598923d634d8af230`
  (prev/rollback `sha256:90ef4f73…`). NO migration. All marketplace + `LIQUIDITY_ENABLED` flags OFF; MonCash unchanged.
- **Dark smoke:** admin 200 + Control Tower literals; backend health 200; new ops routes exist + guarded
  (401 unauth / 503 flag-off); MonCash callback 403; `MarketplaceAdjudicationProposal=0`, marketplace rows 0,
  `OutboundPayment=0`, `JournalEntry=83` unchanged. No financial row or journal created.
