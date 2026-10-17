# Savings Tracker

A local web app to plan and track your money: create an account, log your income, split it automatically across **your own custom categories** (e.g., Bills, Needs, Debts, Savings) by the percentages you define, then record real expenses and savings deposits/withdrawals and compare plan vs actual on a dashboard.

- **Income splitting** — each income is split live across categories with the largest-remainder method, in whole cents (Σ% ≤ 100; the leftover shows as "Unallocated").
- **Plan vs actual** — dashboard with allocated/actual/remaining per category, progress bars, and over-budget highlighting.
- **Savings** — deposits/withdrawals on savings-kind categories with an all-time running balance (negative balances are allowed and shown in red).
- **Wallet balance** — all-time cash on hand (income − spent − savings net) on the dashboard, next to the savings balance.
- **Category filters** — multi-select, OR-combined toggle chips on the Expenses, Savings and Dashboard tabs; all-time balances and dashboard cards stay account-wide.
- **Night mode** — Light / Dark / System switch in the nav (and on the sign-in/register cards), persisted in `localStorage` (`st-theme`) and applied by a tiny inline script before first paint — no flash on reload.
- **Accounts with admin approval** — the first account becomes the admin; later registrations wait for approval, and every account — the admin included — only ever sees its own data. One SQLite file, no cloud.
- **Ships empty by design** — no preset users, categories, or demo data; the first account you register becomes the admin, then you create your own buckets.

**Contents:** [Setup](#setup) · [Usage](#usage-first-run-walkthrough) · [Demo data](#optional-demo-data-dev-only) · [Configuration](#configuration) · [API reference](#api-reference) · [Docker](#run-with-docker) · [Scripts](#scripts) · [Architecture](#architecture-map) · [Testing](#testing)

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v4 (semantic token layer; light/dark themes) |
| Database | SQLite via Prisma 6 (`@prisma/client`) |
| Validation | zod (all API request bodies/params) |
| Tests | vitest (money/allocation/date/wallet/validation/auth helpers + route-level tests: category guards, session + per-account isolation, admin approvals) |

## Prerequisites

- Node.js 22+ and npm (developed on Node 24 LTS).
- No database server required — Prisma uses a local SQLite file (`prisma/dev.db`).
- Optional: Docker (any modern version) if you prefer to run the app as a container — see [Run with Docker](#run-with-docker).

## Setup

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"; SESSION_SECRET optional in dev (PowerShell: Copy-Item .env.example .env)
npm run db:migrate          # creates prisma/dev.db and applies migrations
npm run dev                 # http://localhost:3000
```

The app starts **empty** (no users, no categories, no entries) — the first account you register becomes the admin. Continue with the usage walkthrough below.

## Usage (first run walkthrough)

1. **Create an account** — open `/register`. The first account ever created becomes the app **admin** and is approved immediately; every later account lands as **pending** until an admin approves it at `/admin/users` — pending and declined accounts cannot sign in. Sign in at `/login`; the session lasts 30 days (httpOnly `st_session` cookie, signed with `SESSION_SECRET`). Each account only ever sees its own data — the admin included.
2. **Create your categories** — open `/categories` (or the onboarding link on the dashboard). For each category set a name, a kind (**Expense** for spending buckets, **Savings** for savings buckets), a percentage of income, and an optional color. The running total must stay at or below **100%** per account; anything below 100% shows as **Unallocated** and is assigned to no category.
3. **Log income** — open `/income`. Enter an amount (e.g. `5000.00`), an optional source, a date, and an optional note. Every income row shows its computed split across your categories (plus an *Unallocated* chip when Σ% < 100%).
4. **Log expenses** — open `/expenses`. Expenses can only be filed against Expense-kind categories. Filter by month and categories (toggle chips — **Clear** resets; multi-select is OR-combined); the list and live total follow the active filters.
5. **Track savings** — open `/savings`. Record deposits and withdrawals against Savings-kind categories. The balance card shows the **all-time** net (red when negative) and the month's net; multi-select filters narrow the list and the month's net, while the balance stays account-wide.
6. **Read the dashboard** — open `/` (Dashboard). Pick a month and compare allocated vs actual per category, with Income / Spent / Net saved / **Wallet balance** summary cards plus the all-time savings balance. Category chips filter the rows below; the cards stay unchanged.
7. **Fix mistakes by deleting** — entries are **create + delete only** (no editing in the MVP). Deleting an income/expense/savings entry is always allowed; deleting a category is blocked while it still has entries, and changing a category's kind is blocked while entries of its current kind exist. Allocations are recomputed live from the current percentages, so changing a % re-computes the plan for every month.
8. **Pick a theme** — the nav has a **Light / Dark / System** switch (the default is System, i.e. your OS preference). The choice is saved in `localStorage` under `st-theme` and re-applied before the first paint on every load, so reloads never flash the wrong theme.

## Optional: demo data (DEV ONLY)

```bash
npm run db:seed
```

This wipes **all tables — users included** — and inserts a small demo dataset owned by a demo **admin** account: categories 35/25/20/20, 2 incomes, 4 expenses, 1 savings deposit dated relative to the current month. Sign in with **`demo` / `demo12345`**. Re-run it anytime to reset (it deletes any accounts you created). It is intentionally opt-in — the app itself always starts empty — and it refuses to run when `NODE_ENV=production`.

## Configuration

### Environment variables

| Variable | Default | Where set | Purpose |
|----------|---------|-----------|---------|
| `DATABASE_URL` | `file:./dev.db` | `.env` (copy from `.env.example`); `file:/app/data/dev.db` in the Docker image | SQLite database file used by Prisma. Relative paths resolve against `prisma/schema.prisma`, so the dev default lives at `prisma/dev.db`. |
| `SESSION_SECRET` | (none) | `.env` (copy from `.env.example`); runtime env in Docker | HMAC-SHA256 key that signs the `st_session` cookie. **Required in production** — sign-in/session checks fail fast without it; development falls back to a fixed insecure secret with a console warning. Generate with `openssl rand -base64 32`. |
| `PORT` | `3000` | Runtime / Docker | Port the Next.js server binds (container default 3000). |
| `HOSTNAME` | `0.0.0.0` (Docker image) | Runtime / Docker | Bind address for the standalone server in the container. |
| `NODE_ENV` | `development` | Next.js / Prisma | `production` enables Next production behavior and makes the dev-only seed script abort. |
| `NEXT_TELEMETRY_DISABLED` | `1` (Docker image) | Build / runtime | Opt out of Next.js telemetry (optional locally). |

### App constants

Source-level configuration lives in `lib/constants.ts`:

| Constant | Value | Effect |
|----------|-------|--------|
| `APP_CURRENCY` | `"PHP"` | Currency used by `formatCents` for every displayed amount (all amounts are stored as integer cents regardless). |
| `APP_LOCALE` | `"en-US"` | `Intl` locale for money/date formatting (renders `₱1,234.56`). |

## API reference

### Conventions

- **JSON in / out; session cookie required.** Every data route requires a signed-in, approved account (`401 Authentication required` otherwise) and reads/writes **only the session account's rows**; another account's id behaves like a missing one (`404`). Auth endpoints live under `/api/auth/*` — see [Authentication](#authentication).
- **Amounts are integer cents.** `amountCents: 500000` is ₱5,000.00. The API never accepts decimal amounts — clients convert (the UI uses `toCents`).
- **Dates** are `YYYY-MM-DD` strings in requests; they are stored as UTC midnight and returned as ISO strings (`"2026-10-01T00:00:00.000Z"`).
- **Month filters** are `YYYY-MM` (months `01`–`12`) and match `[1st 00:00 UTC, 1st of next month 00:00 UTC)`.
- **Optional string fields** (`source`, `note`) may be omitted or sent empty; empty strings are stored as `null`.
- **Success responses:** raw entity/array JSON; `201` on create with the created object; `204` with an empty body on delete.
- **Errors** are always `{ "error": "<human-readable message>" }`:

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON body, validation failure, Σ% would exceed 100, or wrong category kind for the entry type |
| `401` | Missing/invalid session (`Authentication required`); bad login credentials (`Invalid username or password`) |
| `403` | Signed in but not allowed: `Account pending admin approval`, `This account registration was declined`, `Admin access required` |
| `404` | Unknown id — including another account's id and an unknown `categoryId` |
| `409` | Conflict: duplicate category name (per account), username already taken, category still in use, blocked kind change, or a registration that was already decided |

Validation failures name the first offending field, e.g. `{ "error": "amountCents: Amount must be greater than zero" }`.

### Authentication

Accounts are local (no email): **the first account ever registered becomes the app admin** (`ADMIN`/`APPROVED`); every later account is created as `USER`/`PENDING` and cannot sign in until an admin approves it (see [Admin](#admin-admin-only)). Sessions are a signed, httpOnly `st_session` cookie (HMAC-SHA256 with `SESSION_SECRET`; `SameSite=Lax`, `Secure` in production; 30-day TTL) — the token is stateless, so signing out clears the cookie while an already-copied token stays valid until it expires. Passwords are stored salted+hashed with `node:crypto` scrypt (`scrypt$salt$hash`) — never in plaintext.

**`POST /api/auth/register`** → `201 { user, message }`. Body: `username` (3–30 chars: letters, digits, `. _ -`) and `password` (≥ 8 chars). The first account gets `Admin account created — sign in to continue.`; later accounts get `Account created — an admin must approve it before you can sign in.` Neither path auto-logs-in, and the route never touches an existing session cookie. Errors: `400` validation; `409 Username "x" is already taken` (case-insensitive).

**`POST /api/auth/login`** → `200 { user }` and sets the session cookie. Errors: `401 Invalid username or password`; `403 Account pending admin approval`; `403 This account registration was declined`.

**`POST /api/auth/logout`** → `204` and clears the cookie (idempotent). **`GET /api/auth/me`** → `200 { user }` for the session account; `401 Authentication required` otherwise.

`user` is always a `UserDTO`: `{ id, username, role, status, createdAt, decidedAt }` — the password hash is never returned.

### Admin (ADMIN only)

Managing registrations is restricted to `ADMIN` accounts; anyone else gets `403 Admin access required`.

**`GET /api/admin/users?status=PENDING|APPROVED|REJECTED|ALL`** → `200 UserDTO[]` in registration order (default `ALL`; unknown status → `400`). The password hash is never included.

**`POST /api/admin/users/[id]/approve`** → `200 { user }` (now `APPROVED`, `decidedAt` set). **`POST /api/admin/users/[id]/reject`** → `200 { user }` (now `REJECTED`). Guards on both: unknown id → `404 User not found`; only `PENDING` rows can be decided → `409 Registration already decided`; an admin cannot decide their own account → `400 You cannot decide your own account`; an ADMIN account can never be rejected → `400 Admin accounts cannot be rejected` (no last-admin lockout exists because admins are never rejected).

### Categories

**`GET /api/categories`** → `200` `CategoryDTO[]`, ordered by id.

```json
[
  {
    "id": 1,
    "name": "Bills",
    "percentage": 35,
    "kind": "EXPENSE",
    "color": "#ef4444",
    "createdAt": "2026-10-17T09:12:33.000Z",
    "expenseCount": 3,
    "savingsCount": 0
  }
]
```

`expenseCount` / `savingsCount` are usage counts used by the UI to preview delete-blocking.

**`POST /api/categories`** → `201` with the created `CategoryDTO`.

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | required; trimmed, 1–40 chars; unique case-insensitively |
| `percentage` | number | required; 0–100 with at most 2 decimals; resulting Σ% must stay ≤ 100 |
| `kind` | `"EXPENSE"` \| `"SAVINGS"` | optional; default `"EXPENSE"` |
| `color` | `"#RRGGBB"` \| `null` | optional |

Errors: `400` validation, or `400` with `Total allocation cannot exceed 100% (would be 105%)`; `409` with `A category named "Bills" already exists` (case-insensitive).

**`PATCH /api/categories/[id]`** → `200` with the updated `CategoryDTO`. Body: any subset of the POST fields (at least one). The Σ% check excludes this category. `"color": null` clears the color.

Errors: `400` validation; `404 Category not found`; `409` duplicate name; `409 Cannot change kind: this category has 3 expense(s) — delete them first` (or the `savings entry(ies)` variant) when changing `kind` while entries of the current kind exist.

**`DELETE /api/categories/[id]`** → `204`.

Errors: `404 Category not found`; `409 Cannot delete "Bills" — it has 3 expense(s) and 0 savings entry(ies). Delete those entries first.`

### Incomes

**`GET /api/incomes`** → `200` `IncomeDTO[]`, newest first. Optional `?month=YYYY-MM`.

```json
{
  "id": 1,
  "amountCents": 500000,
  "source": "Salary",
  "date": "2026-10-01T00:00:00.000Z",
  "note": null,
  "createdAt": "2026-10-17T09:12:33.000Z"
}
```

**`POST /api/incomes`** → `201` with the created `IncomeDTO`.

| Field | Type | Rules |
|-------|------|-------|
| `amountCents` | integer | required; > 0 |
| `date` | string | required; `YYYY-MM-DD`, must be a real calendar date |
| `source` | string | optional; ≤ 60 chars |
| `note` | string | optional; ≤ 200 chars |

**`DELETE /api/incomes/[id]`** → `204`; `404 Income not found`.

### Expenses

**`GET /api/expenses`** → `200` `ExpenseDTO[]` with the category embedded, newest first. Filters: `?month=YYYY-MM` and `?categoryIds=1,2,3` (they combine; the id list is OR-combined — T29). An empty `categoryIds=` means **all categories**, unknown ids match nothing, and a malformed list → `400 categoryIds must be a comma-separated list of positive integers`.

```json
{
  "id": 1,
  "amountCents": 20000,
  "date": "2026-10-05T00:00:00.000Z",
  "note": "Electricity",
  "categoryId": 1,
  "category": { "id": 1, "name": "Bills", "kind": "EXPENSE", "color": "#ef4444" },
  "createdAt": "2026-10-17T09:14:02.000Z"
}
```

**`POST /api/expenses`** → `201` with the created `ExpenseDTO`.

| Field | Type | Rules |
|-------|------|-------|
| `amountCents` | integer | required; > 0 |
| `date` | string | required; `YYYY-MM-DD` |
| `categoryId` | integer | required; must reference an existing **EXPENSE**-kind category |
| `note` | string | optional; ≤ 200 chars |

Errors: `404 Category not found` for an unknown `categoryId`; `400 Use Savings entries for savings categories` for a SAVINGS-kind category.

**`DELETE /api/expenses/[id]`** → `204`; `404 Expense not found`.

### Savings

**`GET /api/savings`** → `200` with the month's entries, the all-time balance, and the month's net. `?month=YYYY-MM` is optional and defaults to the current UTC month. `?categoryIds=1,2,3` (T29, same syntax as Expenses) narrows the entries **and** `monthNetCents`; `balanceCents` always stays account-wide.

```json
{
  "entries": [
    {
      "id": 1,
      "amountCents": 100000,
      "direction": "DEPOSIT",
      "date": "2026-10-02T00:00:00.000Z",
      "note": "Emergency fund",
      "categoryId": 2,
      "category": { "id": 2, "name": "Savings", "kind": "SAVINGS", "color": "#22c55e" },
      "createdAt": "2026-10-17T09:15:10.000Z"
    }
  ],
  "balanceCents": 80000,
  "monthNetCents": 80000
}
```

- `entries` — the requested month's entries, newest first, category embedded.
- `balanceCents` — **all-time** net across all savings categories (deposits − withdrawals); may be negative.
- `monthNetCents` — net (deposits − withdrawals) for the requested month (after the `categoryIds` filter, when given).

**`POST /api/savings`** → `201` with the created `SavingsEntryDTO`.

| Field | Type | Rules |
|-------|------|-------|
| `amountCents` | integer | required; > 0 |
| `direction` | `"DEPOSIT"` \| `"WITHDRAWAL"` | required |
| `date` | string | required; `YYYY-MM-DD` |
| `categoryId` | integer | required; must reference an existing **SAVINGS**-kind category |
| `note` | string | optional; ≤ 200 chars |

Errors: `404 Category not found` for an unknown `categoryId`; `400 Savings entries need a SAVINGS-kind category (create one in Categories first)` for a non-SAVINGS category. Withdrawals that push the balance below zero are allowed.

**`DELETE /api/savings/[id]`** → `204`; `404 Savings entry not found`.

### Overview (dashboard)

**`GET /api/overview`** → `200` with the full dashboard payload. `?month=YYYY-MM` is optional and defaults to the current UTC month.

```json
{
  "month": "2026-10",
  "incomeTotalCents": 500000,
  "unallocatedCents": 200000,
  "categories": [
    {
      "id": 1,
      "name": "Bills",
      "kind": "EXPENSE",
      "color": "#ef4444",
      "percentage": 40,
      "allocatedCents": 200000,
      "actualCents": 20000,
      "remainingCents": 180000,
      "progress": 0.1
    },
    {
      "id": 2,
      "name": "Savings",
      "kind": "SAVINGS",
      "color": "#22c55e",
      "percentage": 20,
      "allocatedCents": 100000,
      "actualCents": 100000,
      "remainingCents": 0,
      "progress": 1
    }
  ],
  "totals": { "spentCents": 20000, "netSavedCents": 100000 },
  "walletBalanceCents": 380000,
  "savingsBalanceCents": 100000
}
```

Field semantics:

- `allocatedCents` — sum of the month's income splits per category, computed **live** from the current percentages (changing a % re-computes history).
- `actualCents` — Σ expenses for `EXPENSE` categories; month deposits − withdrawals for `SAVINGS` categories.
- `remainingCents` — `allocatedCents − actualCents`; can go negative.
- `progress` — `actualCents / allocatedCents`, or `0` when allocated is 0; values `> 1` mean over budget (the UI shows red).
- `totals.spentCents` — Σ actuals of all expense-kind categories; `totals.netSavedCents` — month net of all savings-kind categories.
- `walletBalanceCents` — **all-time** cash on hand (D18): all-time income − all-time expenses − savings net (deposits − withdrawals). Withdrawals return cash to the wallet; negative is allowed and shown red; independent of `month`.
- `savingsBalanceCents` — all-time net across all savings categories (independent of `month`).
- The dashboard's category chips filter the category rows **client-side**; summary cards and balances always stay account-wide.

### End-to-end example (curl)

```bash
# 0. Register the first account (becomes the admin) and sign in — keep the cookie
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpassword1"}'
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpassword1"}'

# 1. Create two categories (Σ = 60%, the rest stays Unallocated)
curl -s -b cookies.txt -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bills","percentage":40,"kind":"EXPENSE","color":"#ef4444"}'
curl -s -b cookies.txt -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Savings","percentage":20,"kind":"SAVINGS","color":"#22c55e"}'

# 2. Log an income of ₱5,000.00
curl -s -b cookies.txt -X POST http://localhost:3000/api/incomes \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":500000,"source":"Salary","date":"2026-10-01"}'

# 3. Log a ₱200.00 expense on Bills (id 1)
curl -s -b cookies.txt -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":20000,"categoryId":1,"date":"2026-10-05","note":"Electricity"}'

# 4. Deposit ₱1,000.00 into Savings (id 2)
curl -s -b cookies.txt -X POST http://localhost:3000/api/savings \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":100000,"direction":"DEPOSIT","categoryId":2,"date":"2026-10-02"}'

# 5. Read the dashboard payload for the month
curl -s -b cookies.txt "http://localhost:3000/api/overview?month=2026-10"
```

The overview response matches the sample payload above (Bills allocated 200000 / actual 20000; Savings allocated 100000 / actual 100000; `unallocatedCents` 200000).

## Run with Docker

```bash
docker build -t savings-tracker .
docker run --rm -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -v savings-data:/app/data savings-tracker
# → http://localhost:3000
```

- The container runs in production mode, so `SESSION_SECRET` is required (sign-in fails fast without it). Pass a **stable** value — sessions are signed with it, so changing it signs everyone out.

- Multi-stage image built on Next.js **standalone output**; the container applies pending Prisma migrations automatically on startup and runs as the non-root `node` user.
- The SQLite database is created at `/app/data/dev.db` **inside the container** (override with the `DATABASE_URL` env var); the `savings-data` volume keeps it across restarts and upgrades. A fresh volume starts **empty** — register the first account (it becomes the admin), then create your categories.
- **Page-redirect note (T33/BUG-QA-05):** in production builds, page-level `redirect()`s (e.g. a signed-in visitor opening `/login`, or a stale session opening an app page) can arrive as `200` + a client-executed `NEXT_REDIRECT` instead of a hard `307` — the fork's postponed/prerender streaming flushes the shell first. The responses are `no-store`, contain **no protected content**, and browsers still land on the target route; the dev server and all JSON APIs keep hard status codes. `/login` and `/register` also keep credentials out of the URL (`method="post"` fallback + submit disabled until hydration).
- To reset the data: stop the container and run `docker volume rm savings-data`.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (Turbopack) on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, next preset) |
| `npm test` | Run unit tests once (vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run db:migrate` | `prisma migrate dev` — apply/create migrations |
| `npm run db:seed` | DEV ONLY: wipe + insert demo data |
| `npm run db:studio` | Open Prisma Studio against the SQLite file |

## Architecture map

```
app/
  layout.tsx            root layout — metadata + the no-FOUC theme script
  globals.css           T30/T31 token layer: semantic CSS variables, `.dark` overrides, shared component classes
  icon.svg              app icon (tab favicon)
  (app)/                signed-in area (URLs unchanged; layout = Nav + secure session guard)
    layout.tsx          re-reads the session from the DB; missing/non-APPROVED → /login
    page.tsx            Dashboard (month picker, summary cards, per-category plan vs actual)
    income/page.tsx     Income list with split preview chips
    expenses/page.tsx   Expenses with month + category filters
    savings/page.tsx    Savings balance, deposits/withdrawals history
    categories/page.tsx Create/edit/delete categories, Σ% indicator
    admin/users/page.tsx Admin-only approvals + member list (pending first, grouped by status)
  (auth)/               signed-out chrome (centered card, no nav)
    login/page.tsx      Sign-in form
    register/page.tsx   Registration form (admin-vs-pending success states)
  api/
    auth/               register/login/logout/me (session cookie; first account = admin)
    admin/users/        ADMIN-only: GET members (?status=) + POST [id]/{approve,reject}
    categories/         GET/POST + PATCH/DELETE [id]   (401 without session; per-account Σ% ≤ 100 + names)
    incomes/            GET (?month=)/POST + DELETE [id]
    expenses/           GET (?month=&categoryIds=)/POST + DELETE [id]   (EXPENSE categories only)
    savings/            GET (?month=&categoryIds= → entries + balance + month net)/POST + DELETE [id]
    overview/           GET (?month=) → dashboard aggregation payload (session account only)
proxy.ts                cookie-only optimistic redirects for app routes (Next 16 proxy; no DB)
lib/
  auth.ts               scrypt password hashing, session token sign/verify, cookie helpers, requireUser/requireAdmin
  constants.ts          APP_CURRENCY / APP_LOCALE (money formatting switches)
  money.ts              integer-cent parsing/formatting (toCents/formatCents)
  allocation.ts         splitIncome — largest-remainder split, integer cents
  wallet.ts             walletBalanceCents — all-time cash-on-hand formula (D18)
  dates.ts              UTC calendar-date helpers (parse/format month & day)
  validation.ts         zod schemas shared by all API routes
  types.ts              API DTO types + Prisma→DTO mappers
  prisma.ts             PrismaClient singleton (survives dev hot-reload)
  api.ts                tiny fetch helper surfacing `{ error }` messages
  use-today.ts          client-only "today" (SSR-safe via useSyncExternalStore)
  use-current-month.ts  client-only "current month" (same pattern)
  use-hydrated.ts       hydration flag — auth submits stay disabled until JS is ready (T33)
components/
  AuthCard.tsx          centered card shell for the auth pages
  LoginForm.tsx         sign-in form (inline errors, loading state)
  RegisterForm.tsx      registration form (success states for admin vs pending)
  AdminUsers.tsx        admin approvals UI (pending first, Approve/Reject, member groups)
  CategoryMultiSelect.tsx toggle-chip multi-select for the Expenses/Savings/Dashboard filters (T29)
  ThemeToggle.tsx       Light/Dark/System switch (localStorage `st-theme`; head script prevents FOUC)
  Nav.tsx               session-aware nav: username, Log out, Admin link (ADMIN only)
  EmptyState.tsx        shared empty-state card
  ProgressBar.tsx       thin progress bar (red over 100%)
prisma/
  schema.prisma         5 models: User + Category, Income, Expense, SavingsEntry (required userId)
  migrations/           init + phase-2 migrations (applied by db:migrate / container start)
  seed.ts               DEV-ONLY demo seeder (demo admin + attached dataset)
Dockerfile              multi-stage production image (standalone output; migrations on start)
docker-entrypoint.sh    runs `prisma migrate deploy`, then the Next.js server
```

### Data model

| Model | Key fields | Notes |
|-------|------------|-------|
| `User` | `id`, `username` (unique), `passwordHash`, `role` (`USER`/`ADMIN`), `status` (`PENDING`/`APPROVED`/`REJECTED`), `createdAt`, `decidedAt` | First-ever registration → `ADMIN`/`APPROVED`. Hash format: `scrypt$salt$hash`. All data rows reference it via required `userId` (`ON DELETE CASCADE`). |
| `Category` | `id`, `name`, `percentage`, `kind` (`EXPENSE`/`SAVINGS`), `color`, `createdAt`, `userId` | No presets — a fresh install has zero rows. Names are unique **per account** (`@@unique([userId, name])`) and Σ% ≤ 100 is enforced per account. `kind` is a `String` (SQLite has no enums) validated by zod. |
| `Income` | `id`, `amountCents`, `source`, `date`, `note`, `createdAt`, `userId` | The split is never stored; allocations are computed live. |
| `Expense` | `id`, `amountCents`, `date`, `note`, `categoryId`, `createdAt`, `userId` | EXPENSE-kind categories of the same account only. |
| `SavingsEntry` | `id`, `amountCents`, `direction` (`DEPOSIT`/`WITHDRAWAL`), `date`, `note`, `categoryId`, `createdAt`, `userId` | SAVINGS-kind categories of the same account only. |

### Money & data rules (short version)

- All amounts are stored as **integer cents** (PHP centavos); never floats.
- Money is displayed as **Philippine pesos (₱)** — the single switch is `APP_CURRENCY` in `lib/constants.ts`.
- Income splits use the **largest-remainder method** in basis points: every cent is assigned, and with Σ% = 100 the allocations sum exactly to the income; with Σ% < 100 the remainder is shown as **Unallocated**.
- Allocations are computed **live** from the current percentages (editing a % re-computes history — by design).
- `Category.kind` is `"EXPENSE" | "SAVINGS"`; expenses only accept EXPENSE categories, savings entries only SAVINGS ones.
- Savings balance = Σ deposits − Σ withdrawals across all savings categories, all-time; negative balances are allowed.
- Everything above is **per account** (D16): users — admins included — only ever see their own categories and entries.
- Dates are plain calendar days stored as UTC midnights; month filters use UTC ranges and the UI never shifts dates by timezone.

## Testing

```bash
npm test                    # unit tests (money, allocation, dates, wallet, validation, auth; route guards, two-account isolation + admin approvals)
npm run lint                # ESLint
npm run build               # type-check + production build
```

Project state, decisions, and the QA verification log live in [`Project_state.md`](./Project_state.md).
