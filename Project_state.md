# Project State — Savings Tracker

> **Agents: start here.** Everything under `## Project Manager` is the single source of truth for scope, decisions, backlog, and status. Read it fully before writing any code. Then execute ONLY the task listed in **Next up**. When finished, follow the **Update protocol (§10)** before ending your session.

---

## Project Manager

**Last updated:** 2026-10-17 · **Plan version:** PM v1 · **Next up:** T04 — Money, allocation & date utilities (with unit tests) · **Progress:** 3/16 tasks

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
**Status:** ⬜ TODO · **Depends on:** T02 · **Files:** `lib/constants.ts`, `lib/money.ts`, `lib/allocation.ts`, `lib/dates.ts` + colocated `*.test.ts`
- `lib/constants.ts`: `APP_CURRENCY = "USD"` (single place to change — see Q1).
- `lib/money.ts`: `toCents(input: string | number): number` (rounds to nearest cent, rejects NaN/negatives), `formatCents(cents: number): string` via `Intl.NumberFormat` with `APP_CURRENCY`.
- `lib/allocation.ts`: `splitIncome(amountCents, categories: { id, percentage }[])` implementing §7 exactly. Return `{ allocations: { categoryId, amountCents }[], unallocatedCents }`.
- `lib/dates.ts`: `parseMonth("YYYY-MM") → { start, end }` (UTC), `formatDate(date) → "YYYY-MM-DD"` using UTC parts, `monthLabel("YYYY-MM")`.
- Tests must cover: 100 cents @ 33.33/33.33/33.34 → [33, 33, 34]; 1 cent @ 50/30/20 → [1, 0, 0]; Σ=80% → unallocated = 20%; invariant `Σ + unallocated == amountCents` across a loop of random values; parseMonth across a year boundary.
- **Acceptance criteria:** `npm test` green; remove `passWithNoTests`.

#### T05 — Categories API
**Status:** ⬜ TODO · **Depends on:** T03, T04 · **Files:** `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`, `lib/validation.ts`, `lib/types.ts`
- zod schemas in `lib/validation.ts`: `name` trimmed 1–40 chars; `percentage` number 0–100, max 2 decimals (`.multipleOf(0.01)` or refine); `kind` in `["EXPENSE","SAVINGS"]`; `color` optional `#RRGGBB`.
- GET → `Category[]` (order by id). POST → create; reject if name exists case-insensitively (409) or if `Σ existing + new > 100.01` (400 with message like `Total allocation cannot exceed 100% (would be 105%)`).
- PATCH → update name/percentage/kind/color with the same checks (exclude self from Σ).
- DELETE → 409 if `expenses` or `savingsEntries` exist; else 204.
- Shared DTO types in `lib/types.ts`.
- **Acceptance criteria:** manual curl/HTTP checks for: happy create; duplicate name; Σ>100; bad kind; PATCH percentage pushing Σ over 100; DELETE blocked and allowed cases; 404s.

#### T06 — Categories UI + navigation + page stubs
**Status:** ⬜ TODO · **Depends on:** T05 · **Files:** `app/layout.tsx`, `components/Nav.tsx`, `app/categories/page.tsx`, stub pages `app/income|expenses|savings/page.tsx`
- `Nav`: app title "Savings Tracker" + links: Dashboard `/`, Income, Expenses, Savings, Categories.
- `/categories`: list (name, kind badge, %, color dot, usage counts), create form, inline edit, delete with `window.confirm`, live "Total: X% · Unallocated: Y%" indicator (green at 100%).
- Empty state: "No categories yet — create your own buckets (e.g., Bills, Needs, Debts, Savings)."
- Create placeholder pages for Income/Expenses/Savings ("Coming soon" is fine; filled in by T08/T10/T12).
- Optional: tiny `lib/api.ts` fetch helper (JSON + error extraction).
- **Acceptance criteria (browser):** create/edit/delete works; Σ>100 blocked with visible error; server errors surface near the form; nav present on all pages; empty DB shows the onboarding empty state.

#### T07 — Income API
**Status:** ⬜ TODO · **Depends on:** T03, T04 · **Files:** `app/api/incomes/route.ts`, `app/api/incomes/[id]/route.ts`
- GET → `Income[]`, newest first; optional `?month=YYYY-MM` filter (§7 month rule; 400 on malformed month).
- POST → `{ amountCents: int > 0, source?: string ≤ 60, date: "YYYY-MM-DD", note?: string ≤ 200 }`; store date at UTC midnight; 201.
- DELETE → 204 / 404.
- **Acceptance criteria:** curl checks incl. month filter across a year boundary; invalid amount/date → 400.

#### T08 — Income UI with split preview
**Status:** ⬜ TODO · **Depends on:** T07, T06 · **Files:** `app/income/page.tsx`, `components/*`
- Form: amount (accepts `1234.56`, convert with `toCents`), source, date (default today), note. List grouped by month heading, newest first, delete per row.
- Each income row shows its **computed split** using `splitIncome` + categories from `/api/categories`: per-category chips + "Unallocated" chip when > 0.
- Empty states: no categories → prompt linking to `/categories`; no incomes → friendly hint.
- **Acceptance criteria (browser):** entering 5000.00 with categories 35/25/20/20 shows 1750/1250/1000/1000; totals sum exactly; delete works; month grouping correct.

#### T09 — Expense API
**Status:** ⬜ TODO · **Depends on:** T05 · **Files:** `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`
- GET → `Expense[]` with `category { id, name, kind, color }` included; filters `?month=` and `?categoryId=`.
- POST → `{ amountCents: int > 0, date, categoryId, note? }`; category must exist and be `kind = "EXPENSE"` else 400 `Use Savings entries for savings categories`. 201.
- DELETE → 204 / 404.
- **Acceptance criteria:** curl checks: happy path; savings-kind category rejected; unknown category 404; month+category filters combine.

#### T10 — Expense UI
**Status:** ⬜ TODO · **Depends on:** T09, T06 · **Files:** `app/expenses/page.tsx`, `components/*`
- Month filter (default current, prev/next), category filter, list grouped by date with category badge + note + amount, delete per row.
- Form: amount, category select (EXPENSE-kind only), date (default today), note.
- Empty states for no categories / no expenses.
- **Acceptance criteria (browser):** add/list/delete works; filters combine; totals change accordingly.

#### T11 — Savings API
**Status:** ⬜ TODO · **Depends on:** T05 · **Files:** `app/api/savings/route.ts`, `app/api/savings/[id]/route.ts`
- GET `?month=` → `{ entries: SavingsEntry[] (with category), balanceCents /* all-time net */, monthNetCents }`.
- POST → `{ amountCents: int > 0, direction: "DEPOSIT"|"WITHDRAWAL", date, categoryId, note? }`; category must be `kind = "SAVINGS"` else 400 `Create a category with kind = Savings first` style message. 201.
- DELETE → 204 / 404. Negative balance allowed (D7/§7).
- **Acceptance criteria:** curl checks: deposit then withdrawal → balance math correct; wrong-kind category rejected; month filter works.

#### T12 — Savings UI
**Status:** ⬜ TODO · **Depends on:** T11, T06 · **Files:** `app/savings/page.tsx`, `components/*`
- Big balance card (all-time, red when negative), month net line, month filter, history list (+green deposits / −red withdrawals) with delete.
- Form with DEPOSIT/WITHDRAWAL toggle, amount, savings-category select, date, note.
- Empty states: no SAVINGS-kind categories → link to `/categories` with explanation; no entries → hint.
- **Acceptance criteria (browser):** deposit 1000 then withdraw 200 → balance 800; list updates; delete works.

#### T13 — Overview (dashboard) API
**Status:** ⬜ TODO · **Depends on:** T07, T09, T11, T05 · **Files:** `app/api/overview/route.ts`
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
**Status:** ⬜ TODO · **Depends on:** T13, T06 · **Files:** `app/page.tsx`, `components/*`
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

### 12. Agent decision log (provisional)

_Append runtime judgment calls here (format: `YYYY-MM-DD · Txx · decision · reason`). PM decisions live in §3._

- 2026-10-17 · T01 · Dev toolchain installed **inside WSL Debian** (Node v24.22.0 LTS via official tarball into `/usr/local`, git 2.47.3 + curl via apt). All project commands run in WSL, not Windows node. · reason: repo lives on the ext4 Linux filesystem; native deps (Prisma engines, Turbopack, SWC) need Linux binaries and Windows/UNC tooling would break them.
- 2026-10-17 · T01 · Repo-local git identity `Full-stack Developer <dev@todo-app.local>` for task commits (D12). · reason: agent commits need an identity; user's global git config left untouched.
- 2026-10-17 · T02 · **Prisma pinned to 6.19.3** (`prisma` + `@prisma/client`), not npm "latest" (currently an 8.0.0-rc prerelease; v7+ requires driver-adapter deps beyond D11). v6 delivers exactly the §4/§5 workflow (`prisma migrate dev`, `.env` DATABASE_URL, `@prisma/client` import). · reason: keeps D11 dependency list exact; plan implementable without PM approval.
- 2026-10-17 · T02 · `npx prisma init` delegated to a remote helper that generated Prisma-7-style scaffolding (`prisma.config.ts`, `prisma-client` generator). Removed `prisma.config.ts` and set generator `prisma-client-js` manually. · reason: `prisma.config.ts` imports `dotenv` (not allowed by D11); classic layout matches §4 (client import from `@prisma/client`).
- 2026-10-17 · T02 · Bumped dev dep `@types/node` ^20 → ^24.19.2. · reason: vitest 5 peer-requires @types/node ≥22; also matches Node 24 runtime. No new packages added.
- 2026-10-17 · T02 · `.env` kept local/gitignored, committed `.env.example` instead. Verified Next ("Environments: .env") and Prisma CLI both auto-load it. · reason: §4 requirement + T02 spec.

### 13. Open questions (for the human)

- **Q1 — Currency/display locale:** defaulted to `USD` in `lib/constants.ts` (`APP_CURRENCY`). Tell the PM your preferred currency symbol (e.g., ₱, €) — change is trivial until the Settings page (Later) exists. Until answered, agents proceed with USD.
- **Q2 — Recurring salary:** MVP = one entry per paycheck, no auto-repeat. Confirm if you want monthly recurrence as a later feature.
- **Q3 — Editing entries:** MVP = create + delete only. Confirm if quick edit of past income/expenses is needed soon.

---

## Full-stack Developer

> Per-task implementation notes, maintained by the Full-stack Developer agent so QA can verify each task against §8. Last updated: 2026-10-17 · Completed: T01.

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
