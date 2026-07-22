# Kiwoo Admin Web

Operator console for the Kiwoo NestJS backend (treasury, KYC/AML, agents, merchants, partners, transactions, audit logs).

## Stack
- React 18 + TypeScript
- Vite 5
- TailwindCSS 3
- React Router 6
- Axios
- Recharts

## Local development

```bash
cd kiwoo_admin_web
cp .env.example .env
# edit .env if your backend is not on http://localhost:3000/
npm install
npm run dev
# open http://localhost:5173
```

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serves the built bundle on :4173
```

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | NestJS backend base URL (trailing `/` recommended) | `http://localhost:3000/` |
| `VITE_ASSET_CODE` | Stablecoin asset code shown in the UI | `HTGe` |
| `VITE_ENV_LABEL` | Environment label shown in the sidebar | `development` |

Vite inlines `VITE_*` vars at build time. Pass them as `--build-arg` when building the Docker image.

The console also lets operators override the API base URL at runtime from **Settings → API base URL** (stored in `localStorage`).

## Docker

```bash
# Build
docker build \
  --build-arg VITE_API_BASE_URL=https://api.kiwoo.ht/ \
  --build-arg VITE_ENV_LABEL=production \
  -t kiwoo/admin-web:latest .

# Run (serves on :8080)
docker run --rm -p 8080:80 kiwoo/admin-web:latest

# Or via compose
docker compose up --build
```

To integrate with the backend's compose, copy the `admin-web` service from `docker-compose.yml` into `kiwoo_backend-main/docker-compose.yml` on the same network.

## Authentication
- POSTs to `auth/signin` with `{ phone | email, password }` and stores the JWT in `localStorage` under `kiwoo.admin.token`.
- All requests attach `Authorization: Bearer <token>`.
- A `401` response clears the token and redirects to `/login`.
- Profile is fetched via `user/profile`; role-based menu visibility uses `user.role` / `user.roles`.

## Backend endpoints — status vs. requirements

The NestJS backend already exposes:

| Module | Endpoint | Method |
| --- | --- | --- |
| Auth | `auth/signin`, `auth/signup`, `auth/request_auth`, `auth/verify_auth`, `auth/reset_password` | — |
| User | `user/profile`, `user/balance` | GET |
| Treasury | `treasury/status`, `treasury/circulating-supply`, `treasury/reserve-report` | GET |
| Treasury | `treasury/mint`, `treasury/burn`, `treasury/freeze-wallet`, `treasury/unfreeze-wallet` | POST |
| KYC | `kyc/status`, `kyc/submit`, `admin/kyc/approve`, `admin/kyc/reject`, `admin/aml/flags` | — |
| Transactions | `transactions/*` (user-scoped) | — |
| Audit | `admin/audit-logs` | GET |
| Health | `health`, `health/db`, `health/stellar` | GET |

### Endpoints expected but not yet implemented

The admin web calls the routes below. Add them server-side (NestJS modules) before those pages will fully work — the UI degrades gracefully (empty tables / surfaced error message) until then.

**KYC**
- `GET admin/kyc/pending` — list submissions awaiting review.

**Agents** (no `agents` module exists yet)
- `GET admin/agents`
- `POST admin/agents/:id/approve`
- `PATCH admin/agents/:id/commissions`
- `GET admin/agents/:id/liquidity`
- `GET admin/agents/:id/activity`

**Merchants** (no `merchants` module exists yet)
- `GET admin/merchants`
- `GET admin/merchants/:id/transactions`
- `GET admin/merchants/:id/qr-requests`
- `GET admin/merchants/:id/settlement`

**Partners / LEH / Corporations** (no module exists yet)
- `GET admin/partners`
- `POST admin/partners`
- `POST admin/partners/:id/muxed`
- `POST admin/partners/:id/rate` and `GET admin/partners/:id/rate`
- `GET admin/partners/:id/transactions`

**Transactions (admin view)**
- `GET admin/transactions` (with filters: `userId`, `partnerId`, `type`, `status`, `from`, `to`, `page`, `pageSize`)
- `GET admin/transactions/:id`

**Role / RBAC**
- Either `user/profile` should return `role` or `roles`, or add `GET admin/me` so the sidebar can hide modules the operator isn't allowed into.

## File list created

```
kiwoo_admin_web/
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── docker-compose.yml
├── index.html
├── nginx.conf
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── lib/
    │   ├── api.ts
    │   └── utils.ts
    ├── types/
    │   └── index.ts
    ├── services/
    │   ├── authService.ts
    │   ├── treasuryService.ts
    │   ├── kycService.ts
    │   ├── agentService.ts
    │   ├── merchantService.ts
    │   ├── partnerService.ts
    │   ├── transactionService.ts
    │   └── auditService.ts
    ├── context/
    │   └── AuthContext.tsx
    ├── components/
    │   ├── ProtectedRoute.tsx
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Topbar.tsx
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── ChartCard.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── DataTable.tsx
    │       ├── FormInput.tsx
    │       ├── Modal.tsx
    │       ├── StatCard.tsx
    │       └── StatusBadge.tsx
    ├── routes/
    │   └── routes.tsx
    └── pages/
        ├── AuditLogs.tsx
        ├── Agents.tsx
        ├── Dashboard.tsx
        ├── Kyc.tsx
        ├── Login.tsx
        ├── Merchants.tsx
        ├── Partners.tsx
        ├── Settings.tsx
        ├── Transactions.tsx
        └── Treasury.tsx
```
