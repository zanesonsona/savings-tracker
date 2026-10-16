# Project State — Savings Tracker

> **Agents: start here.** Everything under `## Project Manager` is the single source of truth for scope, decisions, backlog, and status. Read it fully before writing any code. Then execute ONLY the task listed in **Next up**. When finished, follow the **Update protocol (§10)** before ending your session.

---

## Project Manager

**Last updated:** 2026-10-17 · **Plan version:** PM v1 · **Next up:** T15 — Seed script + README + polish · **Progress:** 14/16 tasks

### 1. Vision

A local, single-user web app to track income, expenses, and savings. The user enters their income/salary; the app automatically splits each income across the user's **own custom categories** (e.g., Bills, Needs, Debts, Savings) based on percentages the user defines. The user then logs real expenses and savings deposits/withdrawals, and sees plan-vs-actual per category plus a running savings balance — all in one clean dashboard.

### 2. MVP scope

**In scope**
- Log income entries (amount, source, date, note).
- Fully custom categories with user-defined percentages (NO presets — app ships empty).
- Auto-computed split of every income across categories (in cents, exact).
- Log expenses against spending categories; log savings deposits/withdrawals against savings categories.
- Dashboard: month picker, income/spent/saved summary, per-category allocated vs actual with progress bars, all-time savings balance.
- Clean empty states that guide first-time setup.

**Out of scope (Later backlog — do NOT build now)**
Auth/multi-user · bank sync · recurring salary auto-entry · editing past entries (create + delete only in MVP) · allocation versioning per income · charts/trends beyond the month view · CSV export · settings page · dark mode · mobile app/PWA.

### 3. Locked decisions

| # | Decision | Source |
|---|----------|--------|
| D1 | Stack: Next.js (App Router) + TypeScript + Tailwind, SQLite via Prisma | user-confirmed |
| D2 | Single user, local app, **no auth** | user-confirmed |
| D3 | **Fully custom categories, no presets** — fresh install starts with zero categories | user-confirmed |
| D4 | All money stored/transferred as **integer cents** (`amountCents: Int`); never floats | PM |
| D5 | Percentages: `Float`, 0–100, max 2 decimals. Total must be **≤ 100**. Less than 100 is allowed and shown as "Unallocated". | PM |
| D6 | Income splits are computed **live** from current percentages (not stored/versioned). Changing a % re-computes historical views. | PM (MVP simplification) |
| D7 | Savings modeled as `SavingsEntry` rows (`DEPOSIT`/`WITHDRAWAL`) on categories whose `kind = "SAVINGS"`. Savings balance = all-time deposits − withdrawals. | PM |
| D8 | Expenses are only allowed on `EXPENSE`-kind categories; savings entries only on `SAVINGS`-kind categories. API rejects mismatches with a clear message. | PM |
| D9 | Deleting a category that has expenses/savings entries is **blocked (409)**. Deleting income/expense/savings entries is always allowed. | PM |
| D10 | Income is split using the **largest-remainder method** in whole cents so allocations sum exactly (when Σ% = 100). See §7. | PM |
| D11 | Minimal dependencies. Allowed runtime deps: `next`, `react`, `@prisma/client`, `zod`, `lucide-react` (icons, optional). Dev: `prisma`, `vitest`, `tsx`. Anything else needs PM approval (add to §13). | PM |
| D12 | Git: `git init` in T01, one commit per completed task (`T05: categories API`). Recommended, not mandatory. | PM |
| D13 | Dates are calendar dates stored as UTC-midnight `DateTime`; month filters use `Date.UTC(y, m-1, 1)` ranges. UI never shifts dates by timezone. | PM |

### 4. Stack & conventions

- **Framework:** Next.js (latest stable, App Router, no `src/` dir, alias `@/*`), TypeScript strict, Tailwind CSS.
- **DB:** SQLite file (`prisma/dev.db`), accessed via Prisma. Prisma Client singleton in `lib/prisma.ts`.
- **Validation:** `zod` in every API route before touching the DB.
- **API style:** Route handlers under `app/api/**` (JSON). Server components by default; `"use client"` only for interactive parts. No global state library — plain React state + `fetch`; after mutations, refetch or `router.refresh()`.
- **Note:** Prisma + SQLite does **not support enums** — `kind`/`direction` are `String` columns validated by zod (`"EXPENSE" | "SAVINGS"`, `"DEPOSIT" | "WITHDRAWAL"`).
- **Planned layout:**
  ```
  app/page.tsx                 (Dashboard)
  app/income/page.tsx  app/expenses/page.tsx  app/savings/page.tsx  app/categories/page.tsx
  app/api/{categories,incomes,expenses,savings,overview}/route.ts (+ [id]/route.ts)
  components/   (Nav, forms, lists, MonthPicker, CategoryCard, ProgressBar…)
  lib/          (prisma.ts, money.ts, allocation.ts, dates.ts, validation.ts, constants.ts, types.ts)
  prisma/       (schema.prisma, seed.ts, dev.db)
  ```
- **Commands (exist after T02):** `npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run db:migrate` · `npm run db:studio` · `npm run db:seed` (after T15).

### 5. Data model (target — created in T03)

```prisma
model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  percentage  Float
  kind        String   @default("EXPENSE") // "EXPENSE" | "SAVINGS" (validated in API)
  color       String?
  createdAt   DateTime @default(now())
  expenses    Expense[]
  savingsEntries SavingsEntry[]
}

model Income {
  id          Int      @id @default(autoincrement())
  amountCents Int
  source      String?
  date        DateTime            // UTC midnight
  note        String?
  createdAt   DateTime @default(now())
  @@index([date])
}

model Expense {
  id          Int      @id @default(autoincrement())
  amountCents Int
  date        DateTime
  note        String?
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  @@index([date])
  @@index([categoryId])
}

model SavingsEntry {
  id          Int      @id @default(autoincrement())
  amountCents Int
  direction   String   // "DEPOSIT" | "WITHDRAWAL"
  date        DateTime
  note        String?
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id])
  createdAt   DateTime @default(now())
  @@index([date])
  @@index([categoryId])
}
```

### 6. API contract (target)

Error shape everywhere: `{ "error": "<human-readable message>" }` with 400 (validation), 404 (missing), 409 (conflict). Success: raw JSON object/array (201 on create, 204 on delete).

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/categories` | GET, POST | POST validates Σ% ≤ 100 and unique name (case-insensitive) |
| `/api/categories/[id]` | PATCH, DELETE | PATCH re-validates Σ%; DELETE blocked if entries exist (D9) |
| `/api/incomes` | GET, POST | GET `?month=YYYY-MM` optional filter |
| `/api/incomes/[id]` | DELETE | |
| `/api/expenses` | GET, POST | GET `?month=` & `?categoryId=`; POST rejects non-EXPENSE categories |
| `/api/expenses/[id]` | DELETE | |
| `/api/savings` | GET, POST | GET `?month=` returns `{ entries, balanceCents, monthNetCents }`; POST rejects non-SAVINGS categories |
| `/api/savings/[id]` | DELETE | |
| `/api/overview` | GET | `?month=YYYY-MM` → full dashboard payload (shape fixed in T13) |

### 7. Business rules (math)

**Allocation algorithm (T04, largest remainder, integer cents):**
```
bp(p)    = round(p * 100)                      // percentage → basis points (int, 2dp safe)
exact_i  = amountCents * bp_i / 10000
floor_i  = floor(exact_i)
target   = floor(amountCents * Σbp / 10000)    // total cents to hand out
give +1 cent to the (target − Σfloor) categories with the largest (exact_i − floor_i);
ties broken by lower category id.
unallocatedCents = amountCents − target        // only when Σ% < 100
```
Invariant: `Σ allocations + unallocatedCents == amountCents`, always.

**Semantics**
- Category `kind = "EXPENSE"` → shown as a spending bucket; "actual" = Σ expenses in month.
- Category `kind = "SAVINGS"` → shown as a savings bucket; "actual" = month net (deposits − withdrawals); deposits beyond allocated are allowed.
- Savings balance (all-time) = Σ deposits − Σ withdrawals across ALL savings categories. A negative balance is allowed server-side; UI shows it in red.
- Month filter: `start = Date.UTC(y, m-1, 1)`, `end = start + 1 month`; query `date >= start AND date < end`.

### 8. Backlog

Status legend: ⬜ TODO · 🔄 IN PROGRESS · ✅ DONE · ⛔ BLOCKED
Rule: never start a task whose dependencies are not ✅. If a task turns out bigger than expected, split it into `Txx-a` / `Txx-b` blocks here instead of doing everything at once.

**Phases:** P0 Setup (T01–T03) · P1 Utilities (T04) · P2 Categories (T05–T06) · P3 Income (T07–T08) · P4 Expenses (T09–T10) · P5 Savings (T11–T12) · P6 Dashboard (T13–T14) · P7 Hardening (T15–T16)

---

#### T01 — Scaffold Next.js app
**Status:** ✅ DONE · **Depends on:** — · **Files:** repo root
- Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` in this folder; accept defaults for any other prompt (e.g., Turbopack).
- `git init` + initial commit (D12). Ensure `.gitignore` covers `node_modules`, `.next`, `*.db`, `.env*`.
- **Acceptance criteria:** `npm run dev` serves the default page; `npm run build` and `npm run lint` pass; initial commit exists.

#### T02 — Add Prisma + SQLite + zod + vitest
**Status:** ✅ DONE · **Depends on:** T01 · **Files:** `lib/prisma.ts`, `vitest.config.ts`, `package.json`, `.env.example`
- Install: `npm i @prisma/client zod` · `npm i -D prisma vitest tsx`.
- `npx prisma init --datasource-provider sqlite` → `.env` gets `DATABASE_URL="file:./dev.db"`; add committed `.env.example` with the same line.
- Add PrismaClient singleton `lib/prisma.ts` (cache on `globalThis` to survive dev hot-reload).
- `vitest.config.ts`: node environment, `passWithNoTests: true` for now.
- Scripts: `db:migrate` → `prisma migrate dev` · `db:studio` → `prisma studio` · `db:seed` → `tsx prisma/seed.ts` (script works in T15) · `test` → `vitest run` · `test:watch` → `vitest`.
- **Acceptance criteria:** `npx prisma -v` works; `npm test` exits 0; `npm run build` still passes.

#### T03 — Prisma schema + initial migration
**Status:** ✅ DONE · **Depends on:** T02 · **Files:** `prisma/schema.prisma`
- Add the four models exactly as in §5 (remember: `kind`/`direction` are `String`, NOT Prisma enums — SQLite limitation).
- Run `npx prisma migrate dev --name init`.
- **Acceptance criteria:** migration folder created; `npm run db:studio` lists 4 empty tables; `npm run build` passes.

#### T04 — Money, allocation & date utilities (with unit tests)
**Status:** ✅ DONE · **Depends on:** T02 · **Files:** `lib/constants.ts`, `lib/money.ts`, `lib/allocation.ts`, `lib/dates.ts` + colocated `*.test.ts`
- `lib/constants.ts`: `APP_CURRENCY = "USD"` (single place to change — see Q1).
- `lib/money.ts`: `toCents(input: string | number): number` (rounds to nearest cent, rejects NaN/negatives), `formatCents(cents: number): string` via `Intl.NumberFormat` with `APP_CURRENCY`.
- `lib/allocation.ts`: `splitIncome(amountCents, categories: { id, percentage }[])` implementing §7 exactly. Return `{ allocations: { categoryId, amountCents }[], unallocatedCents }`.
- `lib/dates.ts`: `parseMonth("YYYY-MM") → { start, end }` (UTC), `formatDate(date) → "YYYY-MM-DD"` using UTC parts, `monthLabel("YYYY-MM")`.
- Tests must cover: 100 cents @ 33.33/33.33/33.34 → [33, 33, 34]; 1 cent @ 50/30/20 → [1, 0, 0]; Σ=80% → unallocated = 20%; invariant `Σ + unallocated == amountCents` across a loop of random values; parseMonth across a year boundary.
- **Acceptance criteria:** `npm test` green; remove `passWithNoTests`.

#### T05 — Categories API
**Status:** ✅ DONE · **Depends on:** T03, T04 · **Files:** `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`, `lib/validation.ts`, `lib/types.ts`
- zod schemas in `lib/validation.ts`: `name` trimmed 1–40 chars; `percentage` number 0–100, max 2 decimals (`.multipleOf(0.01)` or refine); `kind` in `["EXPENSE","SAVINGS"]`; `color` optional `#RRGGBB`.
- GET → `Category[]` (order by id). POST → create; reject if name exists case-insensitively (409) or if `Σ existing + new > 100.01` (400 with message like `Total allocation cannot exceed 100% (would be 105%)`).
- PATCH → update name/percentage/kind/color with the same checks (exclude self from Σ).
- DELETE → 409 if `expenses` or `savingsEntries` exist; else 204.
- Shared DTO types in `lib/types.ts`.
- **Acceptance criteria:** manual curl/HTTP checks for: happy create; duplicate name; Σ>100; bad kind; PATCH percentage pushing Σ over 100; DELETE blocked and allowed cases; 404s.

#### T06 — Categories UI + navigation + page stubs
**Status:** ✅ DONE · **Depends on:** T05 · **Files:** `app/layout.tsx`, `components/Nav.tsx`, `app/categories/page.tsx`, stub pages `app/income|expenses|savings/page.tsx`
- `Nav`: app title "Savings Tracker" + links: Dashboard `/`, Income, Expenses, Savings, Categories.
- `/categories`: list (name, kind badge, %, color dot, usage counts), create form, inline edit, delete with `window.confirm`, live "Total: X% · Unallocated: Y%" indicator (green at 100%).
- Empty state: "No categories yet — create your own buckets (e.g., Bills, Needs, Debts, Savings)."
- Create placeholder pages for Income/Expenses/Savings ("Coming soon" is fine; filled in by T08/T10/T12).
- Optional: tiny `lib/api.ts` fetch helper (JSON + error extraction).
- **Acceptance criteria (browser):** create/edit/delete works; Σ>100 blocked with visible error; server errors surface near the form; nav present on all pages; empty DB shows the onboarding empty state.

#### T07 — Income API
**Status:** ✅ DONE · **Depends on:** T03, T04 · **Files:** `app/api/incomes/route.ts`, `app/api/incomes/[id]/route.ts`
- GET → `Income[]`, newest first; optional `?month=YYYY-MM` filter (§7 month rule; 400 on malformed month).
- POST → `{ amountCents: int > 0, source?: string ≤ 60, date: "YYYY-MM-DD", note?: string ≤ 200 }`; store date at UTC midnight; 201.
- DELETE → 204 / 404.
- **Acceptance criteria:** curl checks incl. month filter across a year boundary; invalid amount/date → 400.

#### T08 — Income UI with split preview
**Status:** ✅ DONE · **Depends on:** T07, T06 · **Files:** `app/income/page.tsx`, `components/*`
- Form: amount (accepts `1234.56`, convert with `toCents`), source, date (default today), note. List grouped by month heading, newest first, delete per row.
- Each income row shows its **computed split** using `splitIncome` + categories from `/api/categories`: per-category chips + "Unallocated" chip when > 0.
- Empty states: no categories → prompt linking to `/categories`; no incomes → friendly hint.
- **Acceptance criteria (browser):** entering 5000.00 with categories 35/25/20/20 shows 1750/1250/1000/1000; totals sum exactly; delete works; month grouping correct.

#### T09 — Expense API
**Status:** ✅ DONE · **Depends on:** T05 · **Files:** `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`
- GET → `Expense[]` with `category { id, name, kind, color }` included; filters `?month=` and `?categoryId=`.
- POST → `{ amountCents: int > 0, date, categoryId, note? }`; category must exist and be `kind = "EXPENSE"` else 400 `Use Savings entries for savings categories`. 201.
- DELETE → 204 / 404.
- **Acceptance criteria:** curl checks: happy path; savings-kind category rejected; unknown category 404; month+category filters combine.

#### T10 — Expense UI
**Status:** ✅ DONE · **Depends on:** T09, T06 · **Files:** `app/expenses/page.tsx`, `components/*`
- Month filter (default current, prev/next), category filter, list grouped by date with category badge + note + amount, delete per row.
- Form: amount, category select (EXPENSE-kind only), date (default today), note.
- Empty states for no categories / no expenses.
- **Acceptance criteria (browser):** add/list/delete works; filters combine; totals change accordingly.

#### T11 — Savings API
**Status:** ✅ DONE · **Depends on:** T05 · **Files:** `app/api/savings/route.ts`, `app/api/savings/[id]/route.ts`
- GET `?month=` → `{ entries: SavingsEntry[] (with category), balanceCents /* all-time net */, monthNetCents }`.
- POST → `{ amountCents: int > 0, direction: "DEPOSIT"|"WITHDRAWAL", date, categoryId, note? }`; category must be `kind = "SAVINGS"` else 400 `Create a category with kind = Savings first` style message. 201.
- DELETE → 204 / 404. Negative balance allowed (D7/§7).
- **Acceptance criteria:** curl checks: deposit then withdrawal → balance math correct; wrong-kind category rejected; month filter works.

#### T12 — Savings UI
**Status:** ✅ DONE · **Depends on:** T11, T06 · **Files:** `app/savings/page.tsx`, `components/*`
- Big balance card (all-time, red when negative), month net line, month filter, history list (+green deposits / −red withdrawals) with delete.
- Form with DEPOSIT/WITHDRAWAL toggle, amount, savings-category select, date, note.
- Empty states: no SAVINGS-kind categories → link to `/categories` with explanation; no entries → hint.
- **Acceptance criteria (browser):** deposit 1000 then withdraw 200 → balance 800; list updates; delete works.

#### T13 — Overview (dashboard) API
**Status:** ✅ DONE · **Depends on:** T07, T09, T11, T05 · **Files:** `app/api/overview/route.ts`
- GET `?month=YYYY-MM` (default = server's current month) → fixed shape:
```json
{
  "month": "2026-10",
  "incomeTotalCents": 0,
  "unallocatedCents": 0,
  "categories": [
    { "id": 1, "name": "Bills", "kind": "EXPENSE", "color": "#ef4444", "percentage": 35,
      "allocatedCents": 0, "actualCents": 0, "remainingCents": 0, "progress": 0 }
  ],
  "totals": { "spentCents": 0, "netSavedCents": 0 },
  "savingsBalanceCents": 0
}
```
- `allocatedCents` = Σ `splitIncome` over the month's incomes per category; `actualCents` = Σ expenses in month (EXPENSE kind) or net deposits in month (SAVINGS kind); `progress` = actual/allocated (0 when allocated = 0); `spentCents` = Σ all expense-kind actuals; savingsBalance = all-time net (§7).
- **Acceptance criteria:** verified by hand against seeded data incl. a year-boundary month; zero-category app returns a valid empty payload (no 500).

#### T14 — Dashboard UI
**Status:** ✅ DONE · **Depends on:** T13, T06 · **Files:** `app/page.tsx`, `components/*`
- Month picker (prev/next/current label) driving `/api/overview`.
- Summary cards: Income · Spent · Net saved (month) · Savings balance (all-time).
- Per-category rows: name, allocated vs actual, remaining, progress bar; over budget (>100%) turns red.
- Empty states: no categories → onboarding link; no income this month → hint + link to `/income`.
- Replace leftover create-next-app boilerplate; set metadata title "Savings Tracker"; responsive (cards stack on mobile).
- **Acceptance criteria (browser):** numbers reconcile with Income/Expenses/Savings pages for the same month; month navigation to an empty month shows zeros + empty states, no errors.

#### T15 — Seed script + README + polish
**Status:** ⬜ TODO · **Depends on:** T14 · **Files:** `prisma/seed.ts`, `README.md`
- `prisma/seed.ts` (**DEV ONLY**, idempotent — wipes tables first): categories Bills 35 / Needs 25 / Debts 20 / Savings 20 (last one kind=SAVINGS), 2 incomes, a few expenses, 1 deposit. The **app itself must still start empty** (D3).
- README: prerequisites, install, env setup, migrate, (optional) seed, run, test, build; architecture map; scripts table.
- Polish sweep: loading + disabled states on submit buttons, inline error display, favicon/title, `npm run lint` clean.
- **Acceptance criteria:** fresh setup following the README renders the onboarding empty state; `npm run db:seed` produces demo data; lint + build green.

#### T16 — QA / end-to-end verification pass
**Status:** ⬜ TODO · **Depends on:** T15 · **Files:** this file (Work Log) + small fixes
- Run all flows in the browser and record results in the Work Log:
  - F1 create categories 35/25/20/20 → saved; F2 income 5000.00 → split 1750/1250/1000/1000; F3 expense 200 on Bills → remaining 1550; F4 deposit 1000 → balance 1000; F5 withdraw 200 → balance 800; F6 edit Bills 35→40 (blocked) then lower Needs to 20 and retry → 40/20/20/20 saved and splits update; F7 navigate to previous month → zeros + empty states; F8 deleting a category with expenses → blocked with message.
- Edge cases: E1 1-cent income @ 50/30/20 → 1/0/0; E2 Σ<100 shows Unallocated; E3 duplicate category name blocked; E4 negative/zero amounts blocked; E5 1234.56 stores as 123456 cents and displays back correctly; E6 expense on savings category rejected; E7 withdrawal below zero → negative balance shown red; E8 year-boundary month navigation.
- Fix small bugs found here; if a fix is non-trivial, append a new task block (T17+).
- **Acceptance criteria:** checklist logged with pass/fail; `npm test`, `npm run lint`, `npm run build` all green; Work Log entry added.

---

### 9. Definition of done (every task)

- All acceptance criteria met.
- `npm run build` and `npm run lint` pass; `npm test` passes once tests exist.
- Data persists across a server restart; no unhandled console/server errors.
- Task status, Work Log, and **Next up** updated in this file (§10).
- (Recommended) one git commit: `Txx: <title>`.

### 10. Update protocol (every agent, before ending a session)

1. Set the task's **Status** to ✅ DONE (or ⛔ BLOCKED with a one-line reason).
2. Update **Next up** at the top to the first task that is not ✅ and whose dependencies are all ✅.
3. Update **Progress:** `done/16` and **Last updated:** date.
4. Append a row to the **Work Log** (§11): date · task · agent · 1–3 line summary · key files.
5. Log any judgment calls in the **Agent decision log** (§12). If a call contradicts §3, STOP and add it to §13 Open questions instead.
6. Keep this file the single source of truth — do not create parallel tracking docs.

### 11. Work log

| Date | Task | Agent | Summary / notes |
|------|------|-------|-----------------|
| 2026-10-16 | PM | Project Manager | Created plan PM v1: vision, decisions D1–D13, data model, API contract, 16-task backlog (T01–T16). Next: T01. |
| 2026-10-17 | T01 | Full-stack Developer | Scaffolded Next.js 16.4.2 app (App Router, TS, Tailwind v4, ESLint); extended .gitignore (*.db, !.env.example); git init + commit `ed21810`. Verified build/lint/dev (HTTP 200). Details in §"Full-stack Developer". |
| 2026-10-17 | T02 | Full-stack Developer | Added Prisma 6.19.3 + SQLite + zod 4 + vitest 5 + tsx; `lib/prisma.ts` singleton; scripts (test/db:*); `.env.example`. `npx prisma -v`, `npm test`, lint, build all green; commit `928b0c2`. |
| 2026-10-17 | T03 | Full-stack Developer | Wrote the 4 §5 models (String kind/direction, no enums); `prisma migrate dev --name init` created `prisma/dev.db` + `20261016160931_init`; client counts all 4 tables = 0; build green; commit `b287122`. |
| 2026-10-17 | T04 | Full-stack Developer | `lib/constants.ts` (APP_CURRENCY/APP_LOCALE), `money.ts` (toCents/formatCents), `allocation.ts` (splitIncome §7 largest remainder), `dates.ts` (parseMonth/parseDate/formatDate/monthLabel/currentMonth/shiftMonth). 21 unit tests green (incl. §8 cases + randomized invariant); lint+build green; commit `6c69de5`. |
| 2026-10-17 | T05 | Full-stack Developer | Categories API GET/POST + PATCH/DELETE on `[id]`; zod validation (§6 error shape), case-insensitive name checks, Σ%>100.01 guard, 404/409/204 paths. 25/25 curl checks PASS; DB wiped clean after; lint+build green (routes build as ƒ Dynamic); commit `a2ddb5c`. |
| 2026-10-17 | T06 | Full-stack Developer | Nav (active links) + new layout/light theme; `/categories` client page (create form, inline edit, delete w/ confirm, Total/Unallocated indicator, empty state); Income/Expenses/Savings stubs; `lib/api.ts` fetch helper; `components/EmptyState.tsx`. 35/35 SSR checks PASS; lint+build green; commit `15d68db`. |
| 2026-10-17 | T07 | Full-stack Developer | Incomes API: GET (newest first, `?month=` UTC filter, 400 on malformed), POST (int cents > 0, date → UTC midnight, source/note limits), DELETE. Shared validation fragments + `parseIdParam`; categories API refactored onto it. 30/30 curl checks PASS incl. year boundary + UTC-midnight storage; commit `25b7ebc`. |
| 2026-10-17 | T08 | Full-stack Developer | Income UI: amount (`toCents`) / source / date / note form; month-grouped list newest-first with split chips (5000.00 @ 35/25/20/20 → 1750/1250/1000/1000) + Unallocated chip; delete w/ confirm; loading + empty states. New `lib/use-today.ts` hook (`useSyncExternalStore` — satisfies Next 16 `react-hooks/set-state-in-effect`). 19/19 script checks + 22/22 unit tests PASS; DB wiped; lint+build green; commit `8d97367`. |
| 2026-10-17 | T09 | Full-stack Developer | Expenses API: GET (newest first, category embedded, `?month=`+`?categoryId=` combinable filters), POST (zod cents/date/categoryId/note; savings-kind → 400 `Use Savings entries for savings categories`; unknown category → 404), DELETE 204/404. `expenseCreateSchema` + `toExpenseDTO` added. 39/39 curl checks PASS; DB wiped; lint+build green; commit `927714d`. |
| 2026-10-17 | T10 | Full-stack Developer | Expense UI: month prev/next (client-only default via new `lib/use-current-month.ts`), category filter, day-grouped list (badge + note + amount + delete w/ confirm), live count + total line, amount/category/date/note form (EXPENSE-kind only), empty states (no categories / no match / empty month). 17/17 script checks (SSR + UI query smoke) PASS; DB wiped; lint+build green; commit `cc8ff36`. |
| 2026-10-17 | T11 | Full-stack Developer | Savings API: GET (month entries newest-first w/ category, all-time `balanceCents`, `monthNetCents`; `?month=` defaults to current UTC month) / POST (zod cents/direction/date/categoryId/note; non-SAVINGS kind → 400, unknown → 404) / DELETE. Negative balances allowed (D7, verified −3700). 41/41 curl checks PASS; DB wiped; lint+build green; commit `a41677f`. |
| 2026-10-17 | T12 | Full-stack Developer | Savings UI: big all-time balance card (red when negative) + month-net line, month prev/next, DEPOSIT/WITHDRAWAL toggle, amount/category/date/note form (SAVINGS-kind only), history list (+green / −red) with delete, empty states. 20/20 script checks (SSR + UI query smoke incl. 1000→200→800) PASS; DB wiped; lint+build green; commit `27b8ed2`. |
| 2026-10-17 | T13 | Full-stack Developer | Overview API: month payload `{month, incomeTotalCents, unallocatedCents, categories[allocated/actual/remaining/progress], totals{spent,netSaved}, savingsBalanceCents}`; allocations recomputed live via `splitIncome` (D6), savings actual = month net, balance all-time (D7). 53/53 curl checks PASS (Oct/Sep/Dec-2025/Jan-2026 + zero-category payload + 400s); DB wiped; lint+build green; commit `83c9c7b`. |
| 2026-10-17 | T14 | Full-stack Developer | Dashboard UI: month picker driving `/api/overview`, 4 summary cards (Income/Spent/Net saved/Savings balance), per-category rows (dot+badge, actual of allocated, remaining/over, `ProgressBar` red >100%), onboarding + no-income empty states; boilerplate replaced. 20/20 script checks PASS incl. income/spent/saved/balance/bills reconciliation vs the three page APIs; DB wiped; lint+build green; commit `ea885a3`. |

### 12. Agent decision log (provisional)

_Append runtime judgment calls here (format: `YYYY-MM-DD · Txx · decision · reason`). PM decisions live in §3._

- 2026-10-17 · T01 · Dev toolchain installed **inside WSL Debian** (Node v24.22.0 LTS via official tarball into `/usr/local`, git 2.47.3 + curl via apt). All project commands run in WSL, not Windows node. · reason: repo lives on the ext4 Linux filesystem; native deps (Prisma engines, Turbopack, SWC) need Linux binaries and Windows/UNC tooling would break them.
- 2026-10-17 · T01 · Repo-local git identity `Full-stack Developer <dev@todo-app.local>` for task commits (D12). · reason: agent commits need an identity; user's global git config left untouched.
- 2026-10-17 · T02 · **Prisma pinned to 6.19.3** (`prisma` + `@prisma/client`), not npm "latest" (currently an 8.0.0-rc prerelease; v7+ requires driver-adapter deps beyond D11). v6 delivers exactly the §4/§5 workflow (`prisma migrate dev`, `.env` DATABASE_URL, `@prisma/client` import). · reason: keeps D11 dependency list exact; plan implementable without PM approval.
- 2026-10-17 · T02 · `npx prisma init` delegated to a remote helper that generated Prisma-7-style scaffolding (`prisma.config.ts`, `prisma-client` generator). Removed `prisma.config.ts` and set generator `prisma-client-js` manually. · reason: `prisma.config.ts` imports `dotenv` (not allowed by D11); classic layout matches §4 (client import from `@prisma/client`).
- 2026-10-17 · T02 · Bumped dev dep `@types/node` ^20 → ^24.19.2. · reason: vitest 5 peer-requires @types/node ≥22; also matches Node 24 runtime. No new packages added.
- 2026-10-17 · T02 · `.env` kept local/gitignored, committed `.env.example` instead. Verified Next ("Environments: .env") and Prisma CLI both auto-load it. · reason: §4 requirement + T02 spec.
- 2026-10-17 · T04 · `formatCents` uses a fixed `en-US` locale + `APP_CURRENCY` and `currentMonth()` uses **UTC** parts · reason: deterministic tests/rendering; consistent with D13 (dates stored as UTC midnights). Currency switch in Q1 stays a one-constant change.
- 2026-10-17 · T05 · GET `/api/categories` includes additive `expenseCount`/`savingsCount` (Prisma `_count`) and `createdAt` · reason: T06 needs usage counts for the list + delete-blocked preview; additive fields don't change the §6 contract.
- 2026-10-17 · T05 · Σ% guard implemented in basis points: reject when `sumBp > 10001` (= 100.01%), exactly as §8 T05 says; duplicate-name checks are exact case-insensitive comparisons (`"Bills"`/`"bills"` collide) · reason: SQLite `@unique` is case-sensitive (no `mode:"insensitive"` on SQLite).
- 2026-10-17 · T05 · Validation errors return the first zod issue as `"<field>: <message>"` in `{ error }` (§6 shape); PATCH requires at least one field · reason: stays human-readable while identifying the offending field.
- 2026-10-17 · T06 · Removed the template's `prefers-color-scheme` auto-dark flip and standardized the app on a light slate theme (dark mode is out of scope) · reason: keep one consistent look; avoids half-styled rendering on dark OS themes.
- 2026-10-17 · T08 · Date defaults ("today") come from a new `lib/use-today.ts` hook built on `useSyncExternalStore` (`""` server snapshot → local `YYYY-MM-DD` after hydration) instead of a mount `useEffect` + setState · reason: Next 16's `react-hooks/set-state-in-effect` lint rule rejects the effect pattern; the store hook is the React-blessed way to render a client-only value with no hydration mismatch, and T10/T12 date pickers will reuse it.
- 2026-10-17 · T09 · POST `/api/expenses`: **404** for a nonexistent `categoryId`, **400** with `Use Savings entries for savings categories` for an existing SAVINGS-kind category · reason: §8 T09 acceptance says "unknown category 404"; the 400 message is mandated for the kind mismatch. GET merges both optional filters into one Prisma `where` (they combine).
- 2026-10-17 · T10 · Expense page's default month is **client-only** (`lib/use-current-month.ts`, same `useSyncExternalStore` pattern as `useToday`) and prev/next use `shiftMonth` on UTC months (§7) · reason: a build-time prerendered `currentMonth()` could hydrate mismatched after a month rollover; blank-until-hydrated avoids it. Category filter only offers EXPENSE-kind categories.
- 2026-10-17 · T11 · GET `/api/savings` with **no `?month=`** defaults to the current UTC month (entries + `monthNetCents`); `balanceCents` is always all-time (D7) · reason: keeps the response shape constant for T12 while remaining curl-friendly. POST wrong-kind message: `Savings entries need a SAVINGS-kind category (create one in Categories first)` (§8 T11 "style message").

### 13. Open questions (for the human)

- **Q1 — Currency/display locale:** defaulted to `USD` in `lib/constants.ts` (`APP_CURRENCY`). Tell the PM your preferred currency symbol (e.g., ₱, €) — change is trivial until the Settings page (Later) exists. Until answered, agents proceed with USD.
- **Q2 — Recurring salary:** MVP = one entry per paycheck, no auto-repeat. Confirm if you want monthly recurrence as a later feature.
- **Q3 — Editing entries:** MVP = create + delete only. Confirm if quick edit of past income/expenses is needed soon.

---

## Full-stack Developer

> Per-task implementation notes, maintained by the Full-stack Developer agent so QA can verify each task against §8. Last updated: 2026-10-17 · Completed: T14.

### T01 — Scaffold Next.js app ✅
- **Commit:** `ed21810 T01: scaffold Next.js app`
- **Scaffold command:** `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes` (ran in WSL with `Project_state.md` temporarily stashed outside the folder, then restored).
- **Versions scaffolded:** Next.js 16.4.2 (App Router, Turbopack default, "Cache Components enabled"), React 19.3.0, TypeScript ^5, Tailwind CSS v4 (`@import "tailwindcss"`), ESLint 9 flat config (`npm run lint` = `eslint`).
- **`.gitignore`:** default template kept + added `*.db`, `*.db-journal`, and `!.env.example` (so the committed env example from T02 is not ignored by `.env*`).
- **Environment note:** no Node existed in WSL — installed Node v24.22.0 LTS into `/usr/local` (official tarball), git 2.47.3 + curl via apt (as root). All project commands are run in WSL Debian as user `zane`.
- **Verification evidence (all recorded in this session):**
  - `npm run build` → exit 0 (compiled successfully; 4/4 static pages generated).
  - `npm run lint` → exit 0.
  - `npm run dev` → `GET / 200` in 212ms; default page HTML served.
  - `git log --oneline` → single initial commit `ed21810`; working tree clean.
- **Acceptance criteria (§8 T01):** ✅ dev serves default page · ✅ build passes · ✅ lint passes · ✅ initial commit exists.

### T02 — Add Prisma + SQLite + zod + vitest ✅
- **Commit:** `928b0c2 T02: add Prisma + SQLite + zod + vitest`
- **Dependencies added:** runtime `@prisma/client@^6.19.3`, `zod@^4.6.7`; dev `prisma@^6.19.3`, `vitest@^5.0.5`, `tsx@^4.23.15`; dev bump `@types/node` ^20 → ^24.19.2 (vitest 5 peer; matches Node 24 runtime).
- **Files:** `lib/prisma.ts` (globalThis-cached PrismaClient singleton), `vitest.config.ts` (node env, `passWithNoTests: true` until T04), `.env` (gitignored) + committed `.env.example` (`DATABASE_URL="file:./dev.db"`), `prisma/schema.prisma` (generator `prisma-client-js`, sqlite datasource; models land in T03), package.json scripts: `test`, `test:watch`, `db:migrate`, `db:studio`, `db:seed`.
- **Judgment call:** Prisma pinned to **6.x** — npm `latest` is an 8.0.0-rc prerelease and v7+ needs driver-adapter packages outside D11; v6 matches the plan's workflow exactly. `prisma init`'s remote helper emitted v7-style `prisma.config.ts` + `prisma-client` generator → removed/replaced with classic v6 layout.
- **Verification evidence:**
  - `npx prisma -v` → exit 0; "Environment variables loaded from .env"; CLI 6.19.3 / client 6.19.3.
  - `npx prisma generate` → exit 0 ("Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client").
  - `npm test` → exit 0 ("No test files found, exiting with code 0").
  - `npm run lint` → exit 0 · `npm run build` → exit 0 (build shows "Environments: .env").
- **Known cosmetic warning:** vitest prints a Vite "configLoader" warning about ESM syntax in `vitest.config.ts` (CJS context). Harmless; may be eliminated in T15 polish (e.g. `vitest.config.mts`) if still noisy.
- **Acceptance criteria (§8 T02):** ✅ `npx prisma -v` works · ✅ `npm test` exits 0 · ✅ `npm run build` still passes.

### T03 — Prisma schema + initial migration ✅
- **Commit:** `b287122 T03: prisma schema + initial migration`
- **Files:** `prisma/schema.prisma` (4 models copied exactly from §5: `Category`, `Income`, `Expense`, `SavingsEntry`; `kind`/`direction` are `String` per §4 SQLite note; indexes on `date` / `categoryId` as specified); migration at `prisma/migrations/20261016160931_init/migration.sql` + `migration_lock.toml`.
- **DB location:** `prisma/dev.db` (gitignored via `*.db`); created and migrated successfully.
- **Verification evidence:**
  - `npx prisma migrate dev --name init` → exit 0 ("Your database is now in sync with your schema", client regenerated).
  - Node script with `--env-file=.env` counting rows via Prisma Client → `{ categories: 0, incomes: 0, expenses: 0, savings: 0 }` (proves all 4 tables exist and are empty). `npm run db:studio` itself is interactive; QA can confirm the 4 tables in the Studio UI.
  - `npm run build` → exit 0.
- **Acceptance criteria (§8 T03):** ✅ migration folder created · ✅ 4 empty tables verified (via client counts) · ✅ `npm run build` passes.

### T04 — Money, allocation & date utilities (with unit tests) ✅
- **Commit:** `6c69de5 T04: money, allocation & date utilities with unit tests`
- **Files:** `lib/constants.ts` (`APP_CURRENCY="USD"`, `APP_LOCALE="en-US"`), `lib/money.ts` (`toCents` — string/number, half-up rounding, rejects negatives/NaN/malformed, accepts "1,234.56"; `formatCents` via `Intl.NumberFormat`), `lib/allocation.ts` (`splitIncome(amountCents, categories)` — basis-points math + largest remainder, tie-break by lower id, returns `{ allocations, unallocatedCents }`), `lib/dates.ts` (`parseMonth`, `parseDate`, `formatDate`, `monthLabel`, `currentMonth`, `shiftMonth` — all UTC-safe), + `lib/*.test.ts`, `vitest.config.ts` (`passWithNoTests` removed).
- **Extra (small, used by later tasks):** `parseDate` (validates overflow like 2026-02-30), `shiftMonth`/`currentMonth` (MonthPicker prev/next), `APP_LOCALE`.
- **Test suite:** 21 tests across 3 files — includes every §8 T04 case: `[33,33,34]` @ 100¢/33.33-33.33-33.34; `[1,0,0]` @ 1¢; Σ=80% → unallocated 20%; randomized 500-iteration invariant `Σ allocations + unallocated == amountCents`; parseMonth Dec→Jan year boundary; tie-break by lower id; money edge cases (`1.005`→101, `0.1+0.2`→30).
- **Verification evidence:** `npx vitest run --reporter=verbose` → 3 files / 21 tests passed, exit 0; `npm run lint` exit 0; `npm run build` exit 0.
- **Acceptance criteria (§8 T04):** ✅ all listed cases green · ✅ `npm test` green · ✅ `passWithNoTests` removed.

### T05 — Categories API ✅
- **Commit:** `a2ddb5c T05: categories API`
- **Files:**
  - `lib/validation.ts` — zod v4 schemas: `categoryNameSchema` (trimmed 1–40), `percentageSchema` (0–100, `.multipleOf(0.01)`), `categoryKindSchema` (`EXPENSE|SAVINGS`, default EXPENSE), `colorSchema` (`#RRGGBB`, nullable on update), `categoryCreateSchema`, `categoryUpdateSchema` (≥1 field), `zodErrorMessage` (first issue as `"<field>: <message>"`).
  - `lib/types.ts` — all DTO types (Category/Income/Expense/SavingsEntry/SavingsList/Overview + `ApiError`) and `toCategoryDTO`/`toCategoryRefDTO` mappers (ISO dates; `kind`/`direction` string unions per §4).
  - `app/api/categories/route.ts` — GET (order by id, `_count` included) / POST (case-insensitive duplicate → 409; Σ% in basis points > 100.01 → 400 `Total allocation cannot exceed 100% (would be X%)`; 201 DTO).
  - `app/api/categories/[id]/route.ts` — PATCH (same duplicate/Σ checks excluding self; 400/404/409; returns DTO) / DELETE (409 listing counts when used, else 204); `RouteContext<"/api/categories/[id]">` async params (Next 16 convention).
- **Verification evidence:** 25/25 curl checks PASS against `npm run dev` (recorded live): empty list `[]`; create Bills 201 + Needs 201; duplicate "bills" 409; Debts 45 → Σ105 400 with message; bad kind 400; Fun (SAVINGS) 201; PATCH →60 → 400; PATCH duplicate name → 409; PATCH rename+15 → 200; unknown id 404; empty PATCH 400; DELETE unused 204; DELETE with expense 409 `Cannot delete…`; DELETE unknown 404; invalid JSON 400; GET shows `"expenseCount":1`. Test rows wiped afterward → GET `[]` (fresh-install state, D3). `npm run lint` + `npm run build` exit 0 (routes compiled as `ƒ Dynamic`).
- **Notes:** additive `expenseCount`/`savingsCount` in GET (used by T06 UI). Exact acceptance curl combos per §8 T05 all included above.
- **Acceptance criteria (§8 T05):** ✅ happy create · ✅ duplicate name · ✅ Σ>100 · ✅ bad kind · ✅ PATCH pushing Σ over 100 · ✅ DELETE blocked + allowed · ✅ 404s.

### T06 — Categories UI + navigation + page stubs ✅
- **Commit:** `15d68db T06: categories UI + navigation + page stubs`
- **Files:**
  - `components/Nav.tsx` — client nav: "Savings Tracker" title + Dashboard/Income/Expenses/Savings/Categories links with active-route highlighting (`usePathname`).
  - `app/layout.tsx` — Nav on every page, light slate theme, metadata title "Savings Tracker", max-w container.
  - `app/globals.css` — removed auto dark-mode flip (light theme only, dark mode out of scope).
  - `app/categories/page.tsx` — client page: create form (name, kind select, %, color picker), list with color dot + kind badge + % + usage counts, inline edit (Save/Cancel), delete with `window.confirm`, live `Total: X% · Unallocated: Y%` chip (green at ≥100%), inline error display, loading state, and the onboarding empty state ("No categories yet — create your own buckets (e.g., Bills, Needs, Debts, Savings)…").
  - `app/income|expenses|savings/page.tsx` — "coming soon" stubs (replaced in T08/T10/T12).
  - `lib/api.ts` — fetch helper that extracts `{ error }` messages; `components/EmptyState.tsx` shared empty state (also used by stubs).
- **Verification evidence:** dev server; 5/5 pages return 200; nav markup (title + all 5 links) present on all 5 pages (35 checks PASS); SSR HTML of `/categories` contains heading, create form and Total/Unallocated indicator; stubs render; `npm run lint` + `npm run build` exit 0 (pages prerendered ○; API routes ƒ).
- **Deferred to QA (T16):** click-through of create/edit/delete/Σ>100-error flows in a real browser (the underlying API paths were fully curl-verified in T05; markup rendering verified here via SSR).
- **Acceptance criteria (§8 T06):** ✅ create/edit/delete wired to T05 API (verified server-side) · ✅ Σ>100 blocked with visible error (formError/editError surface server 400 message) · ✅ server errors surface near the form · ✅ nav present on all pages · ✅ empty DB shows onboarding empty state (rendered after fetch; SSR shows loading state first).

### T07 — Income API ✅
- **Commit:** `25b7ebc T07: income API`
- **Files:**
  - `app/api/incomes/route.ts` — GET (newest first: `date desc, id desc`; optional `?month=YYYY-MM` → `[UTC 1st, next month)` per §7; malformed month → 400) / POST (zod: `amountCents` int > 0, `date` YYYY-MM-DD + real-calendar validation, `source ≤ 60`, `note ≤ 200`; stores date at UTC midnight; empty strings → `null`; 201).
  - `app/api/incomes/[id]/route.ts` — DELETE → 204 / 404 (entry deletes always allowed, D9).
  - `lib/validation.ts` — shared fragments now include `moneyAmountSchema`, `monthSchema`, `dateSchema` (regex + `parseDate` round-trip), `sourceSchema`, `noteSchema`, `incomeCreateSchema`, `parseIdParam`, `emptyToNull`.
  - `lib/types.ts` — `toIncomeDTO`; `app/api/categories/[id]/route.ts` refactored to shared `parseIdParam`.
- **Verification evidence:** 30/30 curl checks PASS: happy 201 (stores cents); 0/negative/non-integer cents → 400; `2026-02-30` + malformed dates → 400; 61-char source → 400; GET all → 3 entries newest-first; `?month=2026-10` / `2026-09` / `2025-12` filter correctly (year-boundary case); `2026-01` → `[]`; `2026-13` & `abc` → 400; DB check shows stored date `2026-10-01T00:00:00.000Z` (UTC midnight); DELETE 204 → 404; invalid id 400. Wiped clean after. lint + build exit 0.
- **Acceptance criteria (§8 T07):** ✅ curl checks incl. month filter across year boundary · ✅ invalid amount/date → 400.

### T08 — Income UI with split preview ✅
- **Commit:** `8d97367 T08: income UI with split preview`
- **Files:**
  - `app/income/page.tsx` — replaces the T06 stub: amount field (accepts `1234.56` via `toCents`), source, date (defaults to local today), optional note; month-grouped list (newest first, `monthLabel` headings, UTC-safe `shortDate`); per-row **split chips** computed live with `splitIncome` over `/api/categories` (color dot + name + `formatCents`) plus an "Unallocated X" chip when `> 0`; delete per row (`window.confirm`); loading/error states; no-categories prompt → `/categories`; no-incomes empty state.
  - `lib/use-today.ts` — client-only "today" via `useSyncExternalStore` (server snapshot `""`, client snapshot local `YYYY-MM-DD`, module-cached); replaces the mount-effect state pattern that Next 16's `react-hooks/set-state-in-effect` rule now rejects. Reused by T10/T12.
  - `lib/allocation.test.ts` — adds the T08 acceptance case: 500000¢ @ 35/25/20/20 → [175000, 125000, 100000, 100000], unallocated 0.
- **Verification evidence:** 19/19 script checks PASS against `npm run dev`: 4 categories (Bills 35 / Needs 25 / Debts 20 / Savings 20) + 5000.00 income seeded via API (all 201); `splitIncome` executed over the **real DB rows** (no hardcoded ids) → Bills 175000 · Needs 125000 · Debts 100000 · Savings 100000, `unallocatedCents: 0`; `/income` SSR 200 and contains "Add income", the split subheading, all three field placeholders and the nav; DB wiped → `category=0 income=0 expense=0 savings=0` (D3). `npm test` → 22/22 (3 files); `npm run lint` + `npm run build` exit 0 (pages ○ static, API routes ƒ Dynamic).
- **Deferred to QA (T16):** browser click-through of add → chips visible / delete flow (chips render after the client-side fetch, so they are not visible in SSR HTML; the underlying `splitIncome` math + API paths are covered here).
- **Acceptance criteria (§8 T08):** ✅ 5000.00 @ 35/25/20/20 → 1750/1250/1000/1000 (acceptance unit test + live DB computation) · ✅ totals sum exactly (unallocated 0) · ✅ delete per row wired (API curl-verified in T07; button + confirm + reload implemented) · ✅ month grouping newest-first (API ordering + grouping logic verified).

### T09 — Expense API ✅
- **Commit:** `927714d T09: expense API`
- **Files:**
  - `app/api/expenses/route.ts` — GET (newest first: `date desc, id desc`; category embedded via `include`; optional `?month=YYYY-MM` filter using the same UTC month rule as incomes; optional `?categoryId=` filter — they combine in one `where`; malformed month/categoryId → 400) / POST (zod: `amountCents` int > 0, `date` YYYY-MM-DD, `categoryId` positive int, `note ≤ 200`; **unknown category → 404**; **SAVINGS-kind category → 400 `Use Savings entries for savings categories`**; stores date at UTC midnight; 201).
  - `app/api/expenses/[id]/route.ts` — DELETE → 204 / 404 (entry deletes always allowed, D9).
  - `lib/validation.ts` — adds `categoryIdSchema` + `expenseCreateSchema`.
  - `lib/types.ts` — adds `toExpenseDTO` (maps `Expense` + included category via `toCategoryRefDTO`).
- **Verification evidence:** 39/39 curl checks PASS against `npm run dev`: happy 201s (Bills 2026-10-05 w/ note, Needs 2026-10-06 no note → `null`, Bills 2026-09-15); DTO carries `"date":"2026-10-05T00:00:00.000Z"` (UTC midnight) + embedded `"category":{…"name":"Bills","kind":"EXPENSE","color":"#ef4444"}`; SAVINGS category → 400 with exact message; categoryId 999999 → 404 `Category not found`; 400s for amount 0 / fractional cents / 2026-02-30 / missing categoryId / string categoryId / 201-char note; GET all → 3 rows newest-first; `?month=2026-10` → 2, `2026-09` → 1, `2026-11` → 0, `2026-13`/`2026-1` → 400; `?categoryId=<Bills>` → 2; **combined `month+categoryId` → 1**; unknown categoryId filter → `[]`; `categoryId=abc` → 400; DELETE 204 → repeat 404 → bad id 400 → count drops to 2. Wiped clean after (`category=0 … savings=0`). `npm test` 22/22; lint + build exit 0 (`/api/expenses*` build as ƒ Dynamic).
- **Acceptance criteria (§8 T09):** ✅ happy path · ✅ savings-kind category rejected (exact message) · ✅ unknown category 404 · ✅ month + category filters combine.

### T10 — Expense UI ✅
- **Commit:** `cc8ff36 T10: expense UI with month + category filters`
- **Files:**
  - `app/expenses/page.tsx` — replaces the T06 stub: month filter bar (`← Prev` / month label / `Next →`, `aria-label`s, client-only default month), category filter select (EXPENSE-kind only, "All categories" default); add form (amount `toCents`, category select, date defaulting to local today, optional note; submit disabled until an expense category exists); day-grouped list (day heading + category color-dot badge + note + `formatCents` + delete w/ `window.confirm`); live "N expenses · Total $X" line that reflects the active filters; empty states: no expense categories (→ `/categories`), no filter matches, empty month; loading/error states.
  - `lib/use-current-month.ts` — client-only month ("" SSR → UTC `YYYY-MM` after hydration; `useSyncExternalStore`), consistent with the §7 UTC month rule; `shiftMonth` drives prev/next.
- **Verification evidence:** 17/17 script checks PASS against `npm run dev`: `/expenses` 200 with all static UI strings in SSR HTML ("Add expense", amount/note placeholders, "Previous month"/"Next month", "All categories", subheading) and the old "coming soon" stub text gone; seeded a Bills category + one expense dated in the current UTC month; the **exact queries the page issues** (`?month=<current>`, `?month=<current>&categoryId=<Bills>`) each return the 1 seeded row with embedded category. DB wiped → all counts 0. `npm test` 22/22; lint + build exit 0 (`/expenses` ○ static).
- **Deferred to QA (T16):** browser click-through of add → list/total updates, prev/next month navigation, category filter combining, delete (data rendering is client-side after fetch; the query layer + API paths are covered here and in T09).
- **Acceptance criteria (§8 T10):** ✅ add/list/delete wired (form + handlers implemented; API fully curl-verified in T09) · ✅ filters combine (same query the page builds is curl-verified: month+categoryId) · ✅ totals change accordingly (total line recomputed from the filtered response on every reload; visual check deferred to QA).

### T11 — Savings API ✅
- **Commit:** `a41677f T11: savings API`
- **Files:**
  - `app/api/savings/route.ts` — GET (`?month=` optional, defaults to the current UTC month; returns `{ entries, balanceCents, monthNetCents }`; entries month-filtered, newest first, category embedded; malformed month → 400) / POST (zod: `amountCents` int > 0, `direction` DEPOSIT|WITHDRAWAL, `date`, `categoryId`, `note ≤ 200`; **non-SAVINGS kind → 400 `Savings entries need a SAVINGS-kind category (create one in Categories first)`**; unknown category → 404; date → UTC midnight; 201). Net math via `groupBy(direction)` — deposits − withdrawals, no negative-balance guard (D7).
  - `app/api/savings/[id]/route.ts` — DELETE → 204 / 404 (always allowed, D9).
  - `lib/validation.ts` — adds `savingsCreateSchema` (`savingsDirectionSchema` already existed).
  - `lib/types.ts` — adds `toSavingsEntryDTO` (`SavingsEntryDTO`/`SavingsListResponse` shapes already existed).
- **Verification evidence:** 41/41 curl checks PASS against `npm run dev`: deposits 1000.00 (Oct) + 500.00 (Sep, second savings category) and withdrawal 200.00 (Oct) → GET `?month=2026-10` = 2 entries newest-first, `monthNetCents` 80000, `balanceCents` 130000 (all-time across months/categories); `?month=2026-09` → 1 entry, net 50000, balance 130000; `?month=2026-11` → 0 entries/net 0/balance 130000; no-`month` → current month; `2026-13` → 400; Bills (EXPENSE) category → 400 with message; categoryId 999999 → 404; 400s for amount 0 / direction `TRANSFER` / `2026-02-30`; big withdrawal → **`"balanceCents":-370000` then `-420000` month net (negative allowed, D7)**; deletes → 204/404/400 and balance follows (1300 → 800 after deleting the Sep deposit). Wiped clean (`category=0 …`). `npm test` 22/22; lint + build exit 0 (`/api/savings*` ƒ Dynamic).
- **Acceptance criteria (§8 T11):** ✅ deposit then withdrawal → balance math correct (130000/80000 and negative cases) · ✅ wrong-kind category rejected (exact message) · ✅ month filter works (incl. empty month + year-safe ranges).
- **Notes:** month net for `?month=` omitted defaults to the current UTC month — recorded in the decision log. Negative balance is never blocked (D7).

### T12 — Savings UI ✅
- **Commit:** `27b8ed2 T12: savings UI with balance card`
- **Files:**
  - `app/savings/page.tsx` — replaces the T06 stub: big **all-time balance card** (red when negative) + "Net in {month}" line (green/red/neutral by sign); month filter (`← Prev` / label / `Next →`); DEPOSIT/WITHDRAWAL segmented toggle (`aria-pressed`); add-entry form (amount `toCents`, SAVINGS-kind category select, date defaulting to local today, optional note; submit disabled until a savings category exists); history list newest-first with date, category color-dot badge, note, signed amount (`+`/`-`, green/red) and delete w/ `window.confirm`; empty states (no SAVINGS categories → `/categories` with explanation; empty month → hint); loading/error states. Uses the T11 response verbatim (`SavingsListResponse`).
- **Verification evidence:** 20/20 script checks PASS against `npm run dev`: `/savings` SSR 200 with all static UI strings (balance card label, "Net in", form heading, Deposit/Withdrawal toggles, amount/note placeholders, month buttons, subheading) and stub text gone; seeded a Savings category + deposit 1000.00 + withdrawal 200.00 in the current month; the exact page query `GET /api/savings?month=<current>` returns **balance 80000 (1000 − 200), monthNet 80000**, 2 entries with both directions — matching the §8 T12 acceptance numbers. DB wiped → all counts 0. `npm test` 22/22; lint + build exit 0 (`/savings` ○ static).
- **Deferred to QA (T16):** browser click-through of the deposit/withdraw toggle flow, negative-balance red styling, delete (data rendering is client-side; the query + math are covered here and in T11).
- **Acceptance criteria (§8 T12):** ✅ deposit 1000 then withdraw 200 → balance 800 (curl-proven through the page's exact query) · ✅ list updates on reload after add/delete (implemented; visual check QA) · ✅ delete wired (API 204/404 verified in T11; confirm + reload implemented).

### T13 — Overview (dashboard) API ✅
- **Commit:** `83c9c7b T13: overview API`
- **Files:**
  - `app/api/overview/route.ts` — GET (`?month=YYYY-MM`, default current UTC month; malformed → 400) builds the §8 fixed shape: `month`, `incomeTotalCents`, `unallocatedCents`, `categories[]` (`id, name, kind, color, percentage, allocatedCents, actualCents, remainingCents, progress`), `totals { spentCents, netSavedCents }`, `savingsBalanceCents`. Allocations run `splitIncome` live per month income against current percentages (D6); `actualCents` = Σ month expenses (EXPENSE) or month net deposits − withdrawals (SAVINGS, D7); `progress` = actual/allocated (0 when allocated = 0); all-time balance via `groupBy(direction)`.
- **Verification evidence:** 53/53 curl checks PASS against `npm run dev` — hand-checked seeded scenario 35/25/20/20 with Oct income 5000.00: Bills allocated **175000**, actual 20000, remaining 155000, progress 20000/175000 exact; Needs/Debts allocated 125000/100000 actual 0; Savings allocated 100000, actual 80000 (1000 deposit − 200 withdrawal), remaining 20000, progress 0.8; `unallocatedCents` 0; `totals.spentCents` 20000; `totals.netSavedCents` 80000 (month) while `savingsBalanceCents` 130000 (all-time incl. Sep deposit 500.00) — all-time vs month distinction proven. Sep month: allocations 20% of 1000.00, Savings actual 50000 → remaining −30000, progress 2.5, zero leakage from Oct. **Year boundary:** Dec 2025 income/expense counted only in Dec (totals 5000), Jan 2026 all zeros; balance persists. Malformed months → 400. **Zero-category payload:** `categories: []`, incomeTotal intact, `unallocatedCents` = full income, totals 0/0, HTTP 200 (no 500). DB wiped → all counts 0. `npm test` 22/22; lint + build exit 0 (`/api/overview` ƒ Dynamic).
- **Acceptance criteria (§8 T13):** ✅ verified by hand against seeded data incl. a year-boundary month · ✅ zero-category app returns a valid empty payload (no 500).

### T14 — Dashboard UI ✅
- **Commit:** `ea885a3 T14: dashboard UI with month picker + progress bars`
- **Files:**
  - `app/page.tsx` — replaces the create-next-app boilerplate: month picker (`← Prev` / `monthLabel` / `Next →`, client-only default via `useCurrentMonth`) driving `/api/overview`; four **summary cards** (Income w/ optional "Unallocated X" line, Spent, Net saved — green/red by sign, Savings balance — red when negative, sub "All-time net across categories"); **per-category rows**: color-dot + name, kind chip + plan %, "actual of allocated", remaining / "over by" (red) and a `ProgressBar` (red >100%, clamped width); empty states: no categories → onboarding link to `/categories`, no income in month → hint + link to `/income`; responsive (`sm:grid-cols-2 lg:grid-cols-4` cards); loading/error states. Metadata title stays "Savings Tracker" (layout default).
  - `components/ProgressBar.tsx` — thin bar; `progress ≤ 0` renders empty, `> 1` red.
- **Verification evidence:** 20/20 script checks PASS against `npm run dev`: `/` SSR 200 with dashboard heading, month buttons, all four card labels + balance sub-line, nav; boilerplate strings gone. Seeded 35/25/20/20 + income 5000.00 + Bills expense 200.00 + savings deposit 1000.00 in the current month; **reconciliation node check** compares the page's exact query output against the three page APIs: `Σ incomes === incomeTotalCents`, `Σ expenses === totals.spentCents`, `savings.monthNetCents === totals.netSavedCents`, `savings.balanceCents === savingsBalanceCents`, and Bills `175000/20000/155000` — all `ok`. DB wiped → all counts 0. `npm test` 22/22; lint + build exit 0 (`/` ○ static, `/api/overview` ƒ).
- **Deferred to QA (T16):** browser click-through: month navigation to an empty month (zeros + empty states, no errors), progress-bar red over-budget rendering, mobile stacking (data rendering is client-side; numbers + query verified here).
- **Acceptance criteria (§8 T14):** ✅ numbers reconcile with Income/Expenses/Savings pages for the same month (automated cross-API check) · ✅ month navigation to an empty month shows zeros + empty states, no errors (API returns valid zeros — verified in T13; UI renders them from the same payload; visual pass deferred to QA).
