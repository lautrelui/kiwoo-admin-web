# Cash-out Partner Management Console (R2)

Administrative UI for managing Cash-out Partner applications and partners. Deployed to **admin.kiwoo.io**
(shared TEST/UAT) 2026-07-27. **Additive & non-execution** — no Marketplace execution, settlement,
liquidity, ledger, replay, or reconciliation code is touched, and no money moves.

## Navigation

A new top-level sidebar section **"Cash-out Partners"** (its own operational domain — deliberately *not*
nested under Marketplace). RBAC: shown to `ADMIN` / `SUPER_ADMIN` / `COMPLIANCE`. The backend is the real
enforcement point (`marketplace.partners.read` / `marketplace.partners.write` + the
`MARKETPLACE_PARTNER_ONBOARDING_ENABLED` flag).

## Routes

| Route | Screen |
|---|---|
| `/cashout-partners/applications` | Applications review queue + partner KPIs + filters/search |
| `/cashout-partners/applications/:id` | Application detail — profile, business, compliance, timeline, notes, actions |
| `/cashout-partners/directory` | Partner directory (provisioned / active / suspended) |
| `/cashout-partners/directory/:id` | Partner detail — profile, schedule, availability, marketplace stats |

## Screens & workflows

### Applications queue
- **KPI cards:** pending review · submitted today · average approval time · eligible partners.
- **Filters:** status, free-text search (name / phone / wallet ID / business / city), city, submitted-from date.
- **Columns:** Applicant (name + wallet), Status, KYC, Trust, City, Submitted, Last updated, Assigned reviewer, Review.
- Row / "Review" → application detail.

### Application detail
- **Profile:** photo, display name, business name, wallet ID, phone, email, languages.
- **Business information:** operating city, neighborhood, operating days + hours, typical cash, payout range, payout methods, preferred contact.
- **Compliance:** KYC status, account standing, trust score, open risk flags, previous disputes (0 — marketplace inactive).
- **Timeline:** immutable, chronological — every audit event (created / edited / submitted / assigned / info-requested / decision / provisioning / activation / availability) merged with internal notes.
- **Internal notes:** append-only (never editable/deletable); timestamped with author.
- **Actions (only those valid for the current state appear):** Assign to Reviewer · Move to Under Review · Request Additional Information · Approve · Reject · Provision Partner · Activate Marketplace · Suspend · Deactivate Marketplace.

**Lifecycle separation the console makes explicit:**
`Approved` ≠ `Marketplace Active`. **Approve** accepts the applicant. **Provision Partner** creates the
partner profile (`PARTICIPANT_PROVISIONED`). **Activate Marketplace** (`MARKETPLACE_ACTIVE`) makes them
eligible to receive requests — the only path, admin-only. Availability (Available/Offline) stays controlled
by the partner in the wallet; the admin controls eligibility/suspension.

### Partner directory & detail
- **Directory columns:** Name, Status, Availability, Capacity, Operating area, Last active, Trust, Current requests, Completed requests.
- **Detail:** profile, operating schedule & capacity, current availability (read-only — partner-controlled), and marketplace statistics (completed payouts, acceptance rate, average response time, customer disputes, customer confirmations). While execution is dark these are honestly **zero**, with an explicit "no marketplace activity yet" banner — never fabricated.
- **Availability values:** `AVAILABLE` / `OFFLINE` (partner-controlled) · `ELIGIBLE` (provisioned) · `SUSPENDED` (admin) · `NOT_ELIGIBLE`.

## Backend endpoints used

All under `admin/marketplace/partner`, `JwtGuard + PermissionsGuard(marketplace.partners.*)`, gated by
`MARKETPLACE_PARTNER_ONBOARDING_ENABLED` (503 when off):
`GET dashboard` · `GET applications` (filters+enrichment) · `GET applications/:id` ·
`GET applications/:id/timeline` · `GET/POST applications/:id/notes` · `POST applications/:id/assign` ·
`POST applications/:id/{start-review,request-info,approve,reject,provision,activate,suspend,deactivate}` ·
`GET partners` · `GET partners/:id`. See backend `docs/marketplace/CASHOUT_PARTNER_ONBOARDING.md`.

## Audit & notifications

Every decision writes an audit row (`marketplace_partner_*` event types incl. `_assigned`, `_note_added`)
and, where applicable, emits the applicant an in-app notification (application approved / information
requested / rejected / provisioned→activated / suspended) via the existing notification hook.

## Security

RBAC enforced server-side; the client makes no privilege decisions. Activation to `MARKETPLACE_ACTIVE` is
admin-only and server-controlled. The console reads compliance data (KYC/standing/trust/risk) read-only and
never reads or writes any execution/settlement object.

## Tests

`src/test/cashout-partners.test.tsx` — workflow/state-validity, queue rendering + filtering, detail actions
(approve→decide, provisioned→activate), directory (zeroed stats), RBAC redirect/allow. Full admin suite: 82
pass; production build clean.
