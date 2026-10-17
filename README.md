# Savings Tracker

A local, single-user web app to plan and track your money: log your income, split it automatically across **your own custom categories** (e.g., Bills, Needs, Debts, Savings) by the percentages you define, then record real expenses and savings deposits/withdrawals and compare plan vs actual on a dashboard.

- **Income splitting** — each income is split live across categories with the largest-remainder method, in whole cents (Σ% ≤ 100; the leftover shows as "Unallocated").
- **Plan vs actual** — dashboard with allocated/actual/remaining per category, progress bars, and over-budget highlighting.
- **Savings** — deposits/withdrawals on savings-kind categories with an all-time running balance (negative balances are allowed and shown in red).
- **No accounts, no auth, no cloud** — one SQLite file, one user, offline.
- **Ships empty by design** — no preset categories and no demo data; you create your own buckets on first run.

**Contents:** [Setup](#setup) · [Usage](#usage-first-run-walkthrough) · [Demo data](#optional-demo-data-dev-only) · [Configuration](#configuration) · [API reference](#api-reference) · [Docker](#run-with-docker) · [Scripts](#scripts) · [Architecture](#architecture-map) · [Testing](#testing)

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma 6 (`@prisma/client`) |
| Validation | zod (all API request bodies/params) |
| Tests | vitest (money/allocation/date helpers + categories route regression tests) |

## Prerequisites

- Node.js 22+ and npm (developed on Node 24 LTS).
- No database server required — Prisma uses a local SQLite file (`prisma/dev.db`).
- Optional: Docker (any modern version) if you prefer to run the app as a container — see [Run with Docker](#run-with-docker).

## Setup

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"  (PowerShell: Copy-Item .env.example .env)
npm run db:migrate          # creates prisma/dev.db and applies migrations
npm run dev                 # http://localhost:3000
```

The app starts **empty** (no categories, no entries). Continue with the usage walkthrough below.

## Usage (first run walkthrough)

1. **Create your categories** — open `/categories` (or the onboarding link on the dashboard). For each category set a name, a kind (**Expense** for spending buckets, **Savings** for savings buckets), a percentage of income, and an optional color. The running total must stay at or below **100%**; anything below 100% shows as **Unallocated** and is assigned to no category.
2. **Log income** — open `/income`. Enter an amount (e.g. `5000.00`), an optional source, a date, and an optional note. Every income row shows its computed split across your categories (plus an *Unallocated* chip when Σ% < 100%).
3. **Log expenses** — open `/expenses`. Expenses can only be filed against Expense-kind categories. Filter by month and category; the list and live total follow the active filters.
4. **Track savings** — open `/savings`. Record deposits and withdrawals against Savings-kind categories. The balance card shows the **all-time** net (red when negative) and the month's net.
5. **Read the dashboard** — open `/` (Dashboard). Pick a month and compare allocated vs actual per category, with Income / Spent / Net saved summary cards and the all-time savings balance.
6. **Fix mistakes by deleting** — entries are **create + delete only** (no editing in the MVP). Deleting an income/expense/savings entry is always allowed; deleting a category is blocked while it still has entries, and changing a category's kind is blocked while entries of its current kind exist. Allocations are recomputed live from the current percentages, so changing a % re-computes the plan for every month.

## Optional: demo data (DEV ONLY)

```bash
npm run db:seed
```

This wipes all tables and inserts a small demo dataset (categories 35/25/20/20, 2 incomes, 4 expenses, 1 savings deposit dated relative to the current month). Re-run it anytime to reset. It is intentionally opt-in — the app itself always starts empty — and it refuses to run when `NODE_ENV=production`.

## Configuration

### Environment variables

| Variable | Default | Where set | Purpose |
|----------|---------|-----------|---------|
| `DATABASE_URL` | `file:./dev.db` | `.env` (copy from `.env.example`); `file:/app/data/dev.db` in the Docker image | SQLite database file used by Prisma. Relative paths resolve against `prisma/schema.prisma`, so the dev default lives at `prisma/dev.db`. |
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

- **JSON in / out; no authentication** (single-user local app). All routes live under `/api`.
- **Amounts are integer cents.** `amountCents: 500000` is ₱5,000.00. The API never accepts decimal amounts — clients convert (the UI uses `toCents`).
- **Dates** are `YYYY-MM-DD` strings in requests; they are stored as UTC midnight and returned as ISO strings (`"2026-10-01T00:00:00.000Z"`).
- **Month filters** are `YYYY-MM` (months `01`–`12`) and match `[1st 00:00 UTC, 1st of next month 00:00 UTC)`.
- **Optional string fields** (`source`, `note`) may be omitted or sent empty; empty strings are stored as `null`.
- **Success responses:** raw entity/array JSON; `201` on create with the created object; `204` with an empty body on delete.
- **Errors** are always `{ "error": "<human-readable message>" }`:

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON body, validation failure, Σ% would exceed 100, or wrong category kind for the entry type |
| `404` | Unknown id (including an unknown `categoryId`) |
| `409` | Conflict: duplicate category name, category still in use, or blocked kind change |

Validation failures name the first offending field, e.g. `{ "error": "amountCents: Amount must be greater than zero" }`.

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

**`GET /api/expenses`** → `200` `ExpenseDTO[]` with the category embedded, newest first. Filters: `?month=YYYY-MM` and `?categoryId=` (they combine).

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

**`GET /api/savings`** → `200` with the month's entries, the all-time balance, and the month's net. `?month=YYYY-MM` is optional and defaults to the current UTC month.

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
- `monthNetCents` — net (deposits − withdrawals) for the requested month.

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
  "savingsBalanceCents": 100000
}
```

Field semantics:

- `allocatedCents` — sum of the month's income splits per category, computed **live** from the current percentages (changing a % re-computes history).
- `actualCents` — Σ expenses for `EXPENSE` categories; month deposits − withdrawals for `SAVINGS` categories.
- `remainingCents` — `allocatedCents − actualCents`; can go negative.
- `progress` — `actualCents / allocatedCents`, or `0` when allocated is 0; values `> 1` mean over budget (the UI shows red).
- `totals.spentCents` — Σ actuals of all expense-kind categories; `totals.netSavedCents` — month net of all savings-kind categories.
- `savingsBalanceCents` — all-time net across all savings categories (independent of `month`).

### End-to-end example (curl)

```bash
# 1. Create two categories (Σ = 60%, the rest stays Unallocated)
curl -s -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bills","percentage":40,"kind":"EXPENSE","color":"#ef4444"}'
curl -s -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Savings","percentage":20,"kind":"SAVINGS","color":"#22c55e"}'

# 2. Log an income of ₱5,000.00
curl -s -X POST http://localhost:3000/api/incomes \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":500000,"source":"Salary","date":"2026-10-01"}'

# 3. Log a ₱200.00 expense on Bills (id 1)
curl -s -X POST http://localhost:3000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":20000,"categoryId":1,"date":"2026-10-05","note":"Electricity"}'

# 4. Deposit ₱1,000.00 into Savings (id 2)
curl -s -X POST http://localhost:3000/api/savings \
  -H 'Content-Type: application/json' \
  -d '{"amountCents":100000,"direction":"DEPOSIT","categoryId":2,"date":"2026-10-02"}'

# 5. Read the dashboard payload for the month
curl -s "http://localhost:3000/api/overview?month=2026-10"
```

The overview response matches the sample payload above (Bills allocated 200000 / actual 20000; Savings allocated 100000 / actual 100000; `unallocatedCents` 200000).

## Run with Docker

```bash
docker build -t savings-tracker .
docker run --rm -p 3000:3000 -v savings-data:/app/data savings-tracker
# → http://localhost:3000
```

- Multi-stage image built on Next.js **standalone output**; the container applies pending Prisma migrations automatically on startup and runs as the non-root `node` user.
- The SQLite database is created at `/app/data/dev.db` **inside the container** (override with the `DATABASE_URL` env var); the `savings-data` volume keeps it across restarts and upgrades. A fresh volume starts **empty** — create your categories in the UI.
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
  page.tsx              Dashboard (month picker, summary cards, per-category plan vs actual)
  income/page.tsx       Income list with split preview chips
  expenses/page.tsx     Expenses with month + category filters
  savings/page.tsx      Savings balance, deposits/withdrawals history
  categories/page.tsx   Create/edit/delete categories, Σ% indicator
  api/
    categories/         GET/POST + PATCH/DELETE [id]   (Σ% ≤ 100, unique names, delete/kind-change guarded)
    incomes/            GET (?month=)/POST + DELETE [id]
    expenses/           GET (?month=&categoryId=)/POST + DELETE [id]   (EXPENSE categories only)
    savings/            GET (?month= → entries + balance + month net)/POST + DELETE [id]
    overview/           GET (?month=) → dashboard aggregation payload
lib/
  constants.ts          APP_CURRENCY / APP_LOCALE (money formatting switches)
  money.ts              integer-cent parsing/formatting (toCents/formatCents)
  allocation.ts         splitIncome — largest-remainder split, integer cents
  dates.ts              UTC calendar-date helpers (parse/format month & day)
  validation.ts         zod schemas shared by all API routes
  types.ts              API DTO types + Prisma→DTO mappers
  api.ts                tiny fetch helper surfacing `{ error }` messages
  use-today.ts          client-only "today" (SSR-safe via useSyncExternalStore)
  use-current-month.ts  client-only "current month" (same pattern)
components/
  Nav.tsx               top navigation with active-route highlighting
  EmptyState.tsx        shared empty-state card
  ProgressBar.tsx       thin progress bar (red over 100%)
prisma/
  schema.prisma         4 models: Category, Income, Expense, SavingsEntry
  migrations/           init migration (applied by db:migrate / container start)
  seed.ts               DEV-ONLY demo seeder
Dockerfile              multi-stage production image (standalone output; migrations on start)
docker-entrypoint.sh    runs `prisma migrate deploy`, then the Next.js server
```

### Data model

| Model | Key fields | Notes |
|-------|------------|-------|
| `Category` | `id`, `name` (unique), `percentage`, `kind` (`EXPENSE`/`SAVINGS`), `color`, `createdAt` | No presets — a fresh install has zero rows. `kind` is a `String` (SQLite has no enums) validated by zod. |
| `Income` | `id`, `amountCents`, `source`, `date`, `note`, `createdAt` | The split is never stored; allocations are computed live. |
| `Expense` | `id`, `amountCents`, `date`, `note`, `categoryId`, `createdAt` | EXPENSE-kind categories only. |
| `SavingsEntry` | `id`, `amountCents`, `direction` (`DEPOSIT`/`WITHDRAWAL`), `date`, `note`, `categoryId`, `createdAt` | SAVINGS-kind categories only. |

### Money & data rules (short version)

- All amounts are stored as **integer cents** (PHP centavos); never floats.
- Money is displayed as **Philippine pesos (₱)** — the single switch is `APP_CURRENCY` in `lib/constants.ts`.
- Income splits use the **largest-remainder method** in basis points: every cent is assigned, and with Σ% = 100 the allocations sum exactly to the income; with Σ% < 100 the remainder is shown as **Unallocated**.
- Allocations are computed **live** from the current percentages (editing a % re-computes history — by design).
- `Category.kind` is `"EXPENSE" | "SAVINGS"`; expenses only accept EXPENSE categories, savings entries only SAVINGS ones.
- Savings balance = Σ deposits − Σ withdrawals across all savings categories, all-time; negative balances are allowed.
- Dates are plain calendar days stored as UTC midnights; month filters use UTC ranges and the UI never shifts dates by timezone.

## Testing

```bash
npm test                    # unit tests (money, allocation, dates, categories route guards)
npm run lint                # ESLint
npm run build               # type-check + production build
```

Project state, decisions, and the QA verification log live in [`Project_state.md`](./Project_state.md).
