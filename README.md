# Savings Tracker

A local, single-user web app to plan and track your money: log your income, split it automatically across **your own custom categories** (e.g., Bills, Needs, Debts, Savings) by the percentages you define, then record real expenses and savings deposits/withdrawals and compare plan vs actual on a dashboard.

- **Income splitting** — each income is split live across categories with the largest-remainder method, in whole cents (Σ% ≤ 100; the leftover shows as "Unallocated").
- **Plan vs actual** — dashboard with allocated/actual/remaining per category, progress bars, and over-budget highlighting.
- **Savings** — deposits/withdrawals on savings-kind categories with an all-time running balance (negative balances are allowed and shown in red).
- **No accounts, no auth, no cloud** — one SQLite file, one user, offline.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma 6 (`@prisma/client`) |
| Validation | zod (all API request bodies/params) |
| Tests | vitest (unit tests for money/allocation/date helpers) |

## Prerequisites

- Node.js 22+ and npm (developed on Node 24 LTS).
- No database server required — Prisma uses a local SQLite file (`prisma/dev.db`).
- Optional: Docker (any modern version) if you prefer to run the app as a container — see [Run with Docker](#run-with-docker).

## Setup

```bash
npm install
cp .env.example .env        # DATABASE_URL="file:./dev.db"
npm run db:migrate          # creates prisma/dev.db and applies migrations
npm run dev                 # http://localhost:3000
```

The app starts **empty**: open the Dashboard and follow the onboarding link to create your own categories first (e.g., Bills 35 / Needs 25 / Debts 20 / Savings 20 — mark the last one as *Savings* kind).

## Optional: demo data (DEV ONLY)

```bash
npm run db:seed
```

This wipes all tables and inserts a small demo dataset (categories 35/25/20/20, 2 incomes, 4 expenses, 1 savings deposit dated relative to the current month). Re-run it anytime to reset. It is intentionally opt-in — the app itself always starts empty.

## Run with Docker

```bash
docker build -t savings-tracker .
docker run --rm -p 3000:3000 -v savings-data:/app/data savings-tracker
# → http://localhost:3000
```

- Multi-stage image built on Next.js **standalone output**; the container applies pending Prisma migrations automatically on startup.
- The SQLite database is created at `/app/data/dev.db` **inside the container** (override with the `DATABASE_URL` env var); the `savings-data` volume keeps it across restarts and upgrades. A fresh volume starts **empty** — create your categories in the UI.
- To reset the demo/data: `docker volume rm savings-data`.

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
  money.ts              integer-cent parsing/formatting (toCents/formatCents)
  allocation.ts         splitIncome — largest-remainder split (§7)
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
  seed.ts               DEV-ONLY demo seeder
Dockerfile              multi-stage production image (standalone output; migrations on start)
docker-entrypoint.sh    runs `prisma migrate deploy`, then the Next.js server
```

### Money & data rules (short version)

- All amounts are stored as **integer cents** (PHP centavos); dates are plain calendar days stored as UTC midnights.
- Money is displayed as **Philippine pesos (₱)** — the single switch is `APP_CURRENCY` in `lib/constants.ts`.
- `Category.kind` is `"EXPENSE" | "SAVINGS"`; expenses only accept EXPENSE categories, savings entries only SAVINGS ones.
- Allocations are computed **live** from the current percentages (editing a % re-computes history — by design).
- Savings balance = Σ deposits − Σ withdrawals across all savings categories, all-time.

## Testing

```bash
npm test                    # unit tests (money, allocation, dates)
npm run lint                # ESLint
npm run build               # type-check + production build
```
