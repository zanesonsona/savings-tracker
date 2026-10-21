# Project State — Savings Tracker

> **Agents: start here.** Everything under `## Project Manager` is the single source of truth for scope, decisions, backlog, and status. Read it fully before writing any code. Then execute ONLY the task listed in **Next up**. When finished, follow the **Update protocol (§10)** before ending your session.

---

## Project Manager

**Last updated:** 2026-10-21 · **Plan version:** PM v3 (Phase 3 added — UI refresh + PWA; Phases 1–3 complete) · **Next up:** — (all planned tasks complete; new findings would start at T41) · **Deployed:** ✅ Railway Free (2026-10-19; Phase 3 redeploy 2026-10-21) → `deployment_plan.md` · **Progress:** Phase 1: 20/20 ✅ (T01–T20) · Phase 2: 13/13 ✅ (T21–T33) · Phase 3: 7/7 ✅ (T34–T40)

### 1. Vision

A local web app to track income, expenses, and savings. The user enters their income/salary; the app automatically splits each income across the user's **own custom categories** (e.g., Bills, Needs, Debts, Savings) based on percentages the user defines. The user then logs real expenses and savings deposits/withdrawals, and sees plan-vs-actual per category plus a running savings balance — all in one clean dashboard. **Phase 2 (added 2026-10-17):** the app becomes multi-account — anyone can register, but signing in requires **Admin approval**, and every account keeps its **own clean record** (categories, income, expenses, savings). Phase 2 also adds an all-time **Wallet balance** (cash not spent or saved), **multi-select category filters** on each tab, a UI polish pass and a **Night mode**. **Phase 3 (added 2026-10-21):** a **refined-fintech UI refresh** — desktop sidebar + mobile bottom tabs, a richer dashboard (hero balance, stat cards, allocation donut, 6-month trend), modern dialogs/toasts/skeletons — and an **installable PWA** with a safe offline fallback that never caches financial data.

### 2. MVP scope

**In scope**
- Log income entries (amount, source, date, note).
- Fully custom categories with user-defined percentages (NO presets — app ships empty).
- Auto-computed split of every income across categories (in cents, exact).
- Log expenses against spending categories; log savings deposits/withdrawals against savings categories.
- Dashboard: month picker, income/spent/saved summary, per-category allocated vs actual with progress bars, all-time savings balance.
- Clean empty states that guide first-time setup.

**Out of scope (Later backlog — do NOT build now)**
Bank sync · recurring salary auto-entry · editing past entries (create + delete only) · allocation versioning per income · charts/analytics beyond the Phase 3 dashboard donut + 6-month trend · CSV export · settings page · native app store packaging · offline editing/sync · push notifications.
*(PM v1 listed auth/multi-user and dark mode here too — both moved into Phase 2. Phase 3 moved the old “charts/trends beyond the month view” and “mobile app/PWA” items into scope, see below.)*

**Phase 2 scope (approved 2026-10-17 — backlog in §8, tasks T21–T33)**

*In scope*
- Local accounts + **login page**: username + password; registration requires **Admin approval** before first sign-in (D14); the **first-ever sign-up becomes the Admin** (D15).
- **Per-account data:** each account gets its own categories, income, expenses, savings and balances; the Admin approves accounts and **never sees others' financial records** (D16).
- **Overall Wallet balance** — all-time cash on hand: income − expenses − savings net (D18).
- **Multi-select category filters** on the Expenses, Savings and Dashboard tabs (D19).
- **UI polish pass** + **Night mode** with a persisted toggle (D20).

*Out of scope (Phase 2)*
- Email verification/notifications, OAuth/social login, password reset/change, account deletion/deactivation, admin-set passwords, shared/household data, multi-device sync, charts beyond the Phase 3 dashboard, CSV export.

**Phase 3 scope (approved 2026-10-21 — backlog in §8, tasks T34–T40)**

*In scope*
- **Refined-fintech UI refresh** (D22): emerald brand accent on the existing token layer, desktop sidebar + mobile bottom tab bar, shared page/card/skeleton/toast/dialog primitives, icon set.
- **Dashboard 2.0** (D25): wallet hero, stat cards with month-over-month deltas, allocation donut, 6-month income-vs-spent trend, category status cards.
- **Page refresh + modern interactions** (D26): Income/Expenses/Savings/Categories/auth screens, add-forms in modal/sheet, styled confirms, toasts, skeletons, reduced-motion-safe transitions.
- **Installable PWA** (D23): manifest, 192/512/maskable/Apple icons, standalone display, shortcuts, install prompt + iOS instructions, theme/viewport metadata.
- **Offline fallback** (D24): hand-written service worker, `/offline` page, offline banner, update toast; no account data, HTML/RSC or API responses cached.

*Out of scope (Phase 3)*
- Cached financial data / offline viewing, offline editing or background sync, push notifications, web-push/VAPID, native app store packaging, custom domains, charts beyond the dashboard donut + 6-month trend, redesign of the API/auth model.

### 3. Locked decisions

| # | Decision | Source |
|---|----------|--------|
| D1 | Stack: Next.js (App Router) + TypeScript + Tailwind, SQLite via Prisma | user-confirmed |
| D2 | ~~Single user, local app, no auth~~ **SUPERSEDED 2026-10-17** — multi-account app with admin-approved registration; still local (SQLite) | user-confirmed (Phase 2 request) |
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
| D14 | **Accounts & approval:** local **username + password** accounts (no email). Register → `status=PENDING`; sign-in allowed only after an **ADMIN approves** (`APPROVED`); `REJECTED` accounts cannot sign in. Roles `"ADMIN" \| "USER"`, statuses `"PENDING" \| "APPROVED" \| "REJECTED"` (String columns — SQLite). Usernames unique case-insensitively, 3–30 chars (`A–Z a–z 0–9 . _ -`); passwords ≥ 8 chars. | user-confirmed (Phase 2 request) |
| D15 | **Admin bootstrap:** the **first-ever registered account** becomes `ADMIN` and is auto-approved; every later registration is `USER` + `PENDING`. No seeded users; a fresh install still starts empty (D3). | user-confirmed 2026-10-17 |
| D16 | **Everything is per account:** categories, income, expenses, savings entries and all balances belong to exactly one account; every query is scoped to the session account. Category names are unique **per account** (composite unique — not global). The Admin approves accounts only and **never sees other accounts' financial data**. | user-confirmed 2026-10-17 |
| D17 | **Auth mechanics:** no new dependencies (D11 stands) — passwords hashed with Node's built-in `crypto.scrypt` (salted, timing-safe verify); sessions are HMAC-SHA256-signed httpOnly cookies (`st_session`, 30 days, `SameSite=Lax`, `Secure` in production) signed with `SESSION_SECRET` (production fails fast if unset; dev uses a fixed dev-only fallback with a console warning). All `/api` data endpoints require a session (401); `/api/admin/**` requires `role=ADMIN` (403 otherwise). | PM |
| D18 | **Wallet balance = cash on hand:** all-time `income − expenses − savings net (deposits − withdrawals)` per account; may be negative (shown red); computed live, never stored. The Savings balance card continues to show money set aside; Wallet shows what's left in hand. | user-confirmed 2026-10-17 |
| D19 | **Category filters:** **multi-select, flat** categories (tick several at once, OR-combined; e.g. Needs + Wants together) on Expenses, Savings and Dashboard. No category-group model. Filters affect the visible list + list totals; all-time balances (savings) stay account-wide. | user-confirmed 2026-10-17 |
| D20 | **UI refresh + Night mode:** light / dark / **system** theme, toggle persisted (`localStorage`), no flash-of-wrong-theme; a token layer (CSS variables) added in T30 so T31 flips one palette. Supersedes the T06 “light theme only” note. | user-confirmed (Phase 2 request) |
| D21 | **Legacy single-user dev data:** rows that predate accounts (dev DBs only — the current DB is empty) are claimed by the **first Admin** created after the upgrade; if implementation makes that unsafe, reset + document the reset instead. | PM |
| D22 | **UI direction (Phase 3):** refined fintech — keep the T30/T31 token layer, add an **emerald brand accent**, soft elevation, chart tokens and larger type; **desktop sidebar + mobile bottom tab bar**; `lucide-react` icons (already allowed by D11); hand-rolled accessible SVG charts; CSS/ViewTransition motion that respects `prefers-reduced-motion`. **No UI/component/chart library.** | user-confirmed 2026-10-21 |
| D23 | **PWA installability:** `app/manifest.ts` with 192/512/maskable/Apple icons, `display: "standalone"`, `start_url`/`scope` `/`, shortcuts to Income/Expenses/Savings, iOS `appleWebApp` metadata and `themeColor`/`viewportFit: cover`; install affordance via `beforeinstallprompt` + iOS “Add to Home Screen” instructions; production-only service-worker registration; HTTPS required (already provided by Railway). | user-confirmed 2026-10-21 |
| D24 | **Offline scope = installable + offline fallback only.** The service worker precaches `/offline`, PWA icons and the manifest; navigations are network-first with `/offline` as fallback; `/_next/static/**` is cache-first; **never** caches `/api/**`, HTML/RSC or account data. No offline viewing/editing, background sync or push notifications. | user-confirmed 2026-10-21 |
| D25 | **Dashboard visualization:** allocation donut from the existing `categories` payload; 6-month income-vs-spent trend via additive `GET /api/overview?trend=6` (UTC months, per account, one query per data table). Charts stay hand-rolled SVG with an accessible text/table fallback — no chart dependency. Supersedes the old “charts/trends beyond the month view” exclusion for this dashboard scope. | user-confirmed 2026-10-21 |
| D26 | **Modern interactions:** add-income/expense/savings forms open in a centered modal on desktop and a bottom sheet on mobile; styled confirm dialogs replace `window.confirm`; toasts report action results; skeleton loaders replace text loading states; subtle motion (CSS + React 19.3 `ViewTransition`) with reduced-motion support. Data/API behavior is unchanged. | user-confirmed 2026-10-21 |

### 4. Stack & conventions

- **Framework:** Next.js (latest stable, App Router, no `src/` dir, alias `@/*`), TypeScript strict, Tailwind CSS.
- **DB:** SQLite file (`prisma/dev.db`), accessed via Prisma. Prisma Client singleton in `lib/prisma.ts`.
- **Validation:** `zod` in every API route before touching the DB.
- **API style:** Route handlers under `app/api/**` (JSON). Server components by default; `"use client"` only for interactive parts. No global state library — plain React state + `fetch`; after mutations, refetch or `router.refresh()`.
- **Auth (Phase 2):** local accounts only; no auth packages (D11 stays) — `node:crypto` scrypt password hashes + HMAC-signed httpOnly session cookie (D17). Every data endpoint reads the session and scopes its queries to that account; admin endpoints check `role === "ADMIN"`. UI routes redirect to `/login` when signed out (the exact guard mechanism — middleware vs per-layout — must follow the bundled Next docs; see T25/AGENTS.md).
- **UI (Phase 3):** all colors/radii/shadows come from the token layer; money renders through `formatCents` with tabular numerals. Reusable primitives live in `components/` (`AppShell`, `PageHeader`, `StatCard`, `Skeleton`, `Toaster`, `ConfirmDialog`, `MonthPicker`, `AllocationDonut`, `TrendChart`). Add-form dialogs reuse the existing page handlers; no new state library (D22/D26).
- **PWA (Phase 3):** `app/manifest.ts` for install metadata; a hand-written `public/sw.js` (no service-worker library) registered only in production; cache policy per **D24** (never cache API/HTML/account data); `/offline` is public and outside the `proxy.ts` guard; PWA behavior is verified against `next build && next start`, not `next dev`.
- **Note:** Prisma + SQLite does **not support enums** — `kind`/`direction` are `String` columns validated by zod (`"EXPENSE" | "SAVINGS"`, `"DEPOSIT" | "WITHDRAWAL"`).
- **Planned layout:**
  ```
  app/(app)/page.tsx            (Dashboard)
  app/(app)/{income,expenses,savings,categories}/page.tsx
  app/(app)/admin/users/page.tsx
  app/(auth)/{login,register}/page.tsx
  app/offline/page.tsx          ← Phase 3 (PWA offline fallback)
  app/manifest.ts               ← Phase 3 (PWA manifest)
  app/api/{categories,incomes,expenses,savings}/route.ts (+ [id]/route.ts)
  app/api/auth/{register,login,logout,me}/route.ts  app/api/admin/users/…
  app/api/overview/route.ts     (Phase 3 adds ?trend=N — T36)
  components/   (AppShell, Nav, PageHeader, StatCard, forms, lists, MonthPicker…, ThemeToggle,
                 AllocationDonut, TrendChart, InstallPrompt, OfflineBanner, PwaRegister ← Phase 3)
  lib/          (prisma.ts, money.ts, allocation.ts, dates.ts, validation.ts, constants.ts,
                 types.ts, auth.ts, use-online.ts ← Phase 3)
  public/       (sw.js, icons/* ← Phase 3)
  prisma/       (schema.prisma, seed.ts, dev.db)
  ```
- **Commands (exist after T02):** `npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run db:migrate` · `npm run db:studio` · `npm run db:seed` (after T15) · Docker (after T20): `docker build -t savings-tracker .` then `docker run --rm -p 3000:3000 -v savings-data:/app/data savings-tracker`.

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

**Phase 2 additions (T21 — created when T21 lands):**

```prisma
model User {
  id             Int            @id @default(autoincrement())
  username       String         @unique               // compared case-insensitively in the API
  passwordHash   String                               // scrypt (Node crypto) — D17
  role           String         @default("USER")      // "ADMIN" | "USER"
  status         String         @default("PENDING")   // "PENDING" | "APPROVED" | "REJECTED"
  createdAt      DateTime       @default(now())
  decidedAt      DateTime?
  categories     Category[]
  incomes        Income[]
  expenses       Expense[]
  savingsEntries SavingsEntry[]
}

// Category, Income, Expense, SavingsEntry each gain:
//   userId Int  +  user User @relation(fields: [userId], references: [id], onDelete: Cascade)  +  @@index([userId])
// Category.name: global @unique → @@unique([userId, name])   (per-account names — D16)
```

### 6. API contract (target)

Error shape everywhere: `{ "error": "<human-readable message>" }` with 400 (validation), 404 (missing), 409 (conflict); Phase 2 adds 401 (signed out) and 403 (not allowed). Success: raw JSON object/array (201 on create, 204 on delete).

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/categories` | GET, POST | POST validates Σ% ≤ 100 and unique name (case-insensitive) |
| `/api/categories/[id]` | PATCH, DELETE | PATCH re-validates Σ%; DELETE blocked if entries exist (D9) |
| `/api/incomes` | GET, POST | GET `?month=YYYY-MM` optional filter |
| `/api/incomes/[id]` | DELETE | |
| `/api/expenses` | GET, POST | GET `?month=` & `?categoryIds=1,2,3` (OR, empty = all); POST rejects non-EXPENSE categories |
| `/api/expenses/[id]` | DELETE | |
| `/api/savings` | GET, POST | GET `?month=` & `?categoryIds=` returns `{ entries, balanceCents, monthNetCents }`; POST rejects non-SAVINGS categories |
| `/api/savings/[id]` | DELETE | |
| `/api/overview` | GET | `?month=YYYY-MM` → full dashboard payload (shape fixed in T13; Phase 2 adds `walletBalanceCents` — T28; Phase 3 adds optional `?trend=1–12` → `trend[]` — T36) |

**Auth & admin endpoints (Phase 2 — added by T23/T27):**

| Endpoint | Methods | Notes |
|---|---|---|
| `/api/auth/register` | POST | `{ username, password }` → 201 `PENDING` account awaiting approval; the **first-ever account** → `ADMIN` + `APPROVED` (D15) |
| `/api/auth/login` | POST | `APPROVED` accounts only → 200 + session cookie; 401 bad credentials; **403 while `PENDING`** (`Account pending admin approval`); 403 when `REJECTED` |
| `/api/auth/logout` | POST | clears the session cookie (204) |
| `/api/auth/me` | GET | the session user, or 401 |
| `/api/admin/users` | GET | **ADMIN only**; list accounts (`?status=PENDING\|APPROVED\|REJECTED\|ALL`); never returns password hashes |
| `/api/admin/users/[id]/approve` · `/reject` | POST | **ADMIN only**; `PENDING` → `APPROVED`/`REJECTED` (409 if already decided); an admin cannot decide their own account |

**Phase 2 change for every data endpoint above:** a session is required (**401** `Authentication required` when signed out) and all reads/writes are scoped to the session account (D16) — another account's ids return **404**, and category names are unique per account.

**Phase 3 change (T36):** `GET /api/overview` accepts an optional `?trend=N` (integer 1–12; malformed/out-of-range → 400). When present, the response adds `trend: [{ month, incomeTotalCents, spentCents, netSavedCents }]` — N entries ending at the selected month. When absent, the payload is unchanged. No other endpoint changes in Phase 3.

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

**Phase 2 rules**

- **Wallet balance (T28, D18):** per account, all-time `walletBalanceCents = Σ income − Σ expenses − (Σ deposits − Σ withdrawals)` — cash on hand; may be negative (shown red); never stored, computed live from the current rows like every other balance.
- **Approval gate (T23):** register → `PENDING` (sign-in blocked, login → 403). Admin approves → `APPROVED` (sign-in works). Rejected → `REJECTED` (login → 403). Deciding is admin-only; an admin cannot decide their own account; an `ADMIN` can never be rejected via the API.
- **Sessions (T22):** signed cookie `st_session` (HMAC-SHA256 over `{ uid, exp }`, secret `SESSION_SECRET`, 30-day expiry, httpOnly, `SameSite=Lax`, `Secure` in production). Expired / tampered / unknown-user sessions are treated as signed out: 401 on APIs, redirect to `/login` on pages.
- **Category filters (T29, D19):** multi-select, OR-combined — `?categoryIds=1,2,3`. Expenses: list + live total follow the selection. Savings: list follows it and `monthNetCents` is computed over the selected categories; all-time `balanceCents` stays account-wide. Dashboard: rows filter client-side; summary cards stay account-wide.

**Phase 3 rules**

- **Trend (T36, D25):** `?trend=N` (integer 1–12) returns N monthly buckets ending at the selected `month` (oldest first). Each bucket: `incomeTotalCents` = Σ incomes, `spentCents` = Σ expenses (EXPENSE-kind actuals), `netSavedCents` = Σ deposits − Σ withdrawals; ranges follow the UTC month rule above and are scoped to the session account. Absent param → no `trend` field.
- **PWA/offline (T38/T39, D23/D24):** the app is installable over HTTPS; the service worker **never** caches `/api/**`, HTML/RSC or account data. Offline navigations fall back to `/offline`; only `/offline`, PWA icons, the manifest and hashed static assets are cached. Installed/standalone mode uses the same auth and session rules.
- **UI behavior (T34–T37, D22/D26):** visual changes must not alter API semantics or money math; delete confirmations remain required; both themes and 390px mobile are part of every UI task's acceptance.

### 8. Backlog

Status legend: ⬜ TODO · 🔄 IN PROGRESS · ✅ DONE · ⛔ BLOCKED
Rule: never start a task whose dependencies are not ✅. If a task turns out bigger than expected, split it into `Txx-a` / `Txx-b` blocks here instead of doing everything at once.

**Phases:** *Phase 1 (MVP — ✅ T01–T20):* P0 Setup (T01–T03) · P1 Utilities (T04) · P2 Categories (T05–T06) · P3 Income (T07–T08) · P4 Expenses (T09–T10) · P5 Savings (T11–T12) · P6 Dashboard (T13–T14) · P7 Hardening (T15–T16 + defect fixes T17–T18 · PHP T19 · Docker T20)
**Phases — Phase 2 (✅ T21–T33):** P8 Accounts & auth (T21–T27) · P9 Wallet balance (T28) · P10 Category filters (T29) · P11 UI polish & Night mode (T30–T31) · P12 Phase 2 QA (T32–T33)
**Phases — Phase 3 (✅ T34–T40):** P13 Design system & shell (T34–T35) · P14 Dashboard & interactions (T36–T37) · P15 PWA & offline (T38–T39) · P16 Phase 3 QA & deploy (T40)

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
**Status:** ✅ DONE · **Depends on:** T14 · **Files:** `prisma/seed.ts`, `README.md`
- `prisma/seed.ts` (**DEV ONLY**, idempotent — wipes tables first): categories Bills 35 / Needs 25 / Debts 20 / Savings 20 (last one kind=SAVINGS), 2 incomes, a few expenses, 1 deposit. The **app itself must still start empty** (D3).
- README: prerequisites, install, env setup, migrate, (optional) seed, run, test, build; architecture map; scripts table.
- Polish sweep: loading + disabled states on submit buttons, inline error display, favicon/title, `npm run lint` clean.
- **Acceptance criteria:** fresh setup following the README renders the onboarding empty state; `npm run db:seed` produces demo data; lint + build green.

#### T16 — QA / end-to-end verification pass
**Status:** ✅ DONE · **Depends on:** T15 · **Files:** this file (Work Log) + small fixes
- Run all flows in the browser and record results in the Work Log:
  - F1 create categories 35/25/20/20 → saved; F2 income 5000.00 → split 1750/1250/1000/1000; F3 expense 200 on Bills → remaining 1550; F4 deposit 1000 → balance 1000; F5 withdraw 200 → balance 800; F6 edit Bills 35→40 (blocked) then lower Needs to 20 and retry → 40/20/20/20 saved and splits update; F7 navigate to previous month → zeros + empty states; F8 deleting a category with expenses → blocked with message.
- Edge cases: E1 1-cent income @ 50/30/20 → 1/0/0; E2 Σ<100 shows Unallocated; E3 duplicate category name blocked; E4 negative/zero amounts blocked; E5 1234.56 stores as 123456 cents and displays back correctly; E6 expense on savings category rejected; E7 withdrawal below zero → negative balance shown red; E8 year-boundary month navigation.
- Fix small bugs found here; if a fix is non-trivial, append a new task block (T17+).
- **Acceptance criteria:** checklist logged with pass/fail; `npm test`, `npm run lint`, `npm run build` all green; Work Log entry added.
- **Result (2026-10-17):** ✅ acceptance met — gates 22/22 · lint clean · build green; full per-task/per-flow/per-edge matrices, evidence and the defect log in the **Senior QA** section below. **2 defects found → queued as T17/T18** (QA reports; dev fixes).

#### T17 — Fix BUG-QA-01: enforce strict Σ% ≤ 100 in the categories API
**Status:** ✅ DONE · **Depends on:** T16 · **Files:** `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`, `app/api/categories/categories-api.test.ts`, `vitest.config.mts`
- **Defect (from QA):** at Σ = 100.00% a POST of `percentage: 0.01` and a PATCH pushing Σ to 100.01 are both accepted — the guards reject only `sumBp > 10001`. Effect with a 5000.00 income: allocations sum 500050¢ vs income 500000¢ and `unallocatedCents` = **−50** → D5 violation ("total must be ≤ 100"). Repro + evidence in the Senior QA defect log (BUG-QA-01).
- **Fix:** tighten **both** guards from `sumBp > 10001` to `sumBp > 10000` (Σ = 100.00 stays allowed and split-exact), keeping the current message format `Total allocation cannot exceed 100% (would be X%)`; add a regression test for the 100.01% attempt.
- **Acceptance criteria:** Σ=100 → POST 0.01 → 400; PATCH to 100.01 → 400; Σ=99.99 → POST 0.01 → 201 (still allowed); `npm test` / lint / build green; QA replay of the repro returns 400 (matrix updated in Senior QA).
- **Result (2026-10-17):** ✅ both guards tightened to `> 10000` (D5) — commit `5ecab99`. HTTP replay: POST 0.01% at Σ=100 → **400** `Total allocation cannot exceed 100% (would be 100.01%)`; PATCH to Σ=100.01 → **400**; Σ=100.00 exactly still valid (POST/PATCH 201/200); Σ=99.99 + 0.01 → **201**. Regression tests + 30/30 unit tests green; lint/build green. **QA re-verified 2026-10-17:** exact repros return 400 in the independent replay; guarded by `X2.*` assertions — BUG-QA-01 closed (see §Senior QA).

#### T18 — Fix BUG-QA-02: block category kind changes while entries exist
**Status:** ✅ DONE · **Depends on:** T16 · **Files:** `app/api/categories/[id]/route.ts`, `app/api/categories/categories-api.test.ts`
- **Defect (from QA):** PATCH `{ kind: "SAVINGS" }` on an EXPENSE category holding an expense returns 200; the expense stays attached to the now-SAVINGS-kind category (**breaks D8**) and dashboard `totals.spentCents` silently drops (21000 → 20000) while the row is still in the DB.
- **Fix:** in PATCH, when `kind` changes, count entries of the **current** kind (`expenses` for EXPENSE→SAVINGS, `savingsEntries` for the reverse) and return **409** if any exist, D9-style (`Cannot change kind: this category has 1 expense(s) — delete them first`; savings variant analogous). Kind change with no entries stays 200.
- **Acceptance criteria:** kind change with entries → 409 (entries untouched, overview unchanged); kind change with no entries → 200; name/percentage/color edits still work on used categories; `npm test` / lint / build green; QA replay of the repro returns 409.
- **Result (2026-10-17):** ✅ 409 with the exact D9-style message on the QA repro (expense 200.00 on Bills → `spentCents` stays **20000**); safe kind change (200); name/percentage/color edits on used categories (200); savings-side variant blocked too (deposit → kind change → 409). Commit `5ecab99`. **QA re-verified 2026-10-17:** repro → 409, totals unchanged; guarded by `X1.*` assertions — BUG-QA-02 closed (see §Senior QA).

#### T19 — Switch the display currency from USD to PHP (answers Q1)
**Status:** ✅ DONE · **Depends on:** T16 · **Files:** `lib/constants.ts`, `lib/money.test.ts`, `lib/allocation.test.ts`, `README.md`
- User decision (2026-10-17): display **Philippine pesos**. Set `APP_CURRENCY = "PHP"`; keep `APP_LOCALE = "en-US"` (Intl renders identically to `en-PH`: `₱1,234.56`; dates stay as-is — out of scope).
- No schema/API/UI structural changes: every screen already formats through `formatCents`, so this is the single-constant switch designed in T04. Amounts remain integer cents (centavos, D4).
- **Acceptance criteria:** money unit tests expect ₱ output; no hardcoded currency symbols elsewhere in `app/`/`components/`/`lib/`; tests/lint/build green.
- **Result (2026-10-17):** ✅ `formatCents(123456)` → `₱1,234.56`, negative → `-₱8.00`; grep shows no remaining `$`/USD display strings in app code; 30/30 unit tests, lint, build green; `"PHP"` confirmed inside the production client bundle (Docker image). Commit `2940322`. **QA re-verified 2026-10-17:** ₱ across the full browser suite on the dev server and the image; source scan clean.

#### T20 — Docker support (production image + SQLite persistence)
**Status:** ✅ DONE · **Depends on:** T15 · **Files:** `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh`, `next.config.ts`, `README.md`
- Three-stage `Dockerfile` on `node:24-bookworm-slim`: **deps** (`npm ci` + isolated Prisma CLI install pinned to the lockfile's exact CLI version) → **builder** (`prisma generate` then `next build` with new `output: "standalone"`) → **runner** (standalone server + `.next/static` + `public` + traced `.prisma` client + `prisma/` schema & migrations + Prisma CLI), runs as the non-root `node` user.
- `docker-entrypoint.sh`: `prisma migrate deploy` (creates the DB on first boot, upgrades on start), then `node server.js`. `DATABASE_URL="file:/app/data/dev.db"` (absolute → layout-independent); `VOLUME /app/data` keeps the DB across restarts; `.dockerignore` keeps the context (and `dev.db`) out of the image.
- **Acceptance criteria:** `docker build` succeeds; container starts, migrates, serves the app; fresh volume starts empty (D3); data persists across a restart; T17 guard + PHP active inside the image.
- **Result (2026-10-17):** ✅ `docker build` OK (~510 MB image); boot log applies migration `20261016160931_init` then `Ready`; `whoami` → `node`; fresh volume → `GET /api/categories` = `[]` (200); 4× POST 201; T17 repro → 400 **in-image**; `/` → 200; `"PHP"` found in built client chunks; `docker restart` with the same volume → data intact. Commit `d0c4b3a`. **QA re-verified 2026-10-17:** image rebuilt independently; fresh-volume in-container checks 15/15 incl. T17/T18 guards; full browser suite 54/54 against the container; restart persistence confirmed (details in §Senior QA).

---

### Phase 2 backlog — Accounts, Wallet, Filters & UX (T21–T33)

> **Planned:** 2026-10-17 (PM v2; decisions D14–D21 confirmed with the user the same day). **Phase 2 is complete (T21–T33 ✅) and deployed.** Same rule as above: never start a task whose dependencies are not ✅.

#### T21 — Auth data model + migration (User + per-account ownership)
**Status:** ✅ DONE · **Depends on:** T20 ✅ · **Files:** `prisma/schema.prisma`, `prisma/migrations/*`
- Add the `User` model and the `userId` relations/indexes exactly as in §5's Phase-2 additions; `Category.name` changes from global `@unique` to `@@unique([userId, name])` (D16); `role`/`status` stay `String` columns validated by zod (SQLite — no enums, §4).
- `npx prisma migrate dev --name phase2_accounts`; client regenerated; `npm run db:studio` shows 5 tables; the app still boots clean on an empty DB (0 users — D3/D15).
- **Legacy dev data (D21):** the DB is empty today (QA left 0/0/0/0), so this is a no-op in practice. If a dev DB does hold rows, do **not** silently hand-edit: implement a safe sequence (e.g. nullable column → the first Admin claims those rows at bootstrap → tighten) and record the actual approach in §12.
- **Acceptance criteria:** migration applies cleanly on the current DB; build/lint green; a fresh start has no user rows.
- **Result (2026-10-17):** ✅ `User` model + per-account ownership landed; migration `20261017044443_phase2_accounts` applied cleanly on the (verified-empty) dev DB — SQLite table-redefine adds a **nullable** `userId` FK (`ON DELETE CASCADE`) + `@@index([userId])` to the four data models and swaps `Category.name` global unique → `@@unique([userId, name])`; 5 tables / 0 users confirmed via Prisma counts + `sqlite_master`/pragma probes; `npm test` 30/30 · lint clean · build green (13/13). Fresh-DB smoke: the full pre-auth flow still works end-to-end (overview reconciles `10000/8000/500/300/300`; deletes 204) and the DB is left fresh-empty. Commit `3070c50`. **Transition call (T21→T26 rollout — rationale in §12):** `userId` ships **nullable** — required fails `tsc` at the 5 pre-auth create sites (probe: 18 errors) and no user may exist before T23 (D3/D15); the first Admin claims NULL-owner rows (T23/D21) and **T26 tightens to required** (§5 target).

#### T22 — Auth core library (scrypt hashes + signed sessions) with unit tests
**Status:** ✅ DONE · **Depends on:** T21 ✅ · **Files:** `lib/auth.ts`, `lib/auth.test.ts`, `.env.example`, `README.md`
- `hashPassword` / `verifyPassword` with Node's built-in `crypto.scrypt` — random per-account salt, timing-safe compare, encoded format (e.g. `scrypt$<salt>$<hash>`). **No new npm deps** (D11/D17).
- Session helpers: `createSessionToken(userId)` / `verifySessionToken(token)` — base64url JSON `{ uid, exp }` + HMAC-SHA256 with `SESSION_SECRET`; `setSessionCookie` / `clearSessionCookie` (httpOnly, `SameSite=Lax`, path `/`; `Secure` in production; 30-day expiry).
- `SESSION_SECRET`: add to `.env.example` + the README configuration table; **production with no secret fails fast**; development falls back to a fixed dev-only secret with a console warning. Docker README note: pass `-e SESSION_SECRET=…`.
- Tests: hash ≠ password; verify true/false; the same password produces different hashes (salted); token round-trip; tampered, expired, wrong-secret and malformed tokens rejected.
- **Acceptance criteria:** `npm test` green including the new file; lint/build green.
- **Result (2026-10-17):** ✅ `lib/auth.ts` shipped on `node:crypto` only (no new deps — D11/D17): scrypt `hashPassword`/`verifyPassword` (random 16-byte salt, `scrypt$<salt>$<hash>` b64url, timing-safe compare) + HMAC-SHA256 session tokens `<payload b64url>.<hmac b64url>` over `{ uid, exp }` (30-day TTL; expired/tampered/wrong-secret/malformed → `null`) + async `setSessionCookie`/`clearSessionCookie` on the Next 16 async `cookies()` API (httpOnly, `SameSite=Lax`, `Secure` in production). `getSessionSecret()`: env → as-is; production missing → **throws** (fail fast); dev/test → fixed fallback + one-time warning. `lib/auth.test.ts` **13/13** (hash format, salted duplicates, round-trip, tampered signature/payload, expiry boundary, wrong secret, malformed, fallback/fail-fast). Gates: `npm test` **43/43** (5 files) · lint clean · `next build` green (13/13 — its `tsc` pass caught a read-only `NODE_ENV` write in the tests, fixed). `.env.example` + README document `SESSION_SECRET`; Docker example passes `-e SESSION_SECRET="$(openssl rand -base64 32)"`. Commit `3ac82e2`.

#### T23 — Auth API (register / login / logout / me) + admin bootstrap
**Status:** ✅ DONE · **Depends on:** T21 ✅, T22 ✅ · **Files:** `app/api/auth/{register,login,logout,me}/route.ts`, `lib/validation.ts`, `lib/types.ts`, `lib/auth.ts`
- `POST /api/auth/register` — `{ username, password }`: username trimmed 3–30 (`A–Z a–z 0–9 . _ -`), unique case-insensitively → 409 `Username "X" is already taken`; password ≥ 8 chars (400 otherwise). Creates `USER`+`PENDING` → 201 `{ user, message }` — **except the first-ever account: `ADMIN`+`APPROVED`** (D15; also claims legacy rows if any per T21/D21), with a distinct message. No auto-login either way.
- `POST /api/auth/login` — 401 `Invalid username or password` (identical message for unknown user vs wrong password); **403 `Account pending admin approval`** for `PENDING`; **403 `This account registration was declined`** for `REJECTED`; on success set the session cookie → 200 `{ user }`.
- `POST /api/auth/logout` → clears the cookie, 204. `GET /api/auth/me` → the session user re-read from the DB (incl. `role`/`status`), or 401.
- Add `requireUser` / `requireAdmin` helpers here (consumed by T25–T27). Validation errors keep the §6 `{ error }` shape.
- **Acceptance criteria (curl):** first register → ADMIN/APPROVED; second → PENDING; PENDING login → 403; approve directly in the DB for now → login 200 + cookie; `me` with cookie → 200, without → 401; logout → `me` 401; duplicate username (case variants) → 409; short password / bad username → 400.
- **Result (2026-10-17):** ✅ All four routes shipped as specced: register (case-insensitive duplicate check in JS → 409; first-ever account → `ADMIN`/`APPROVED` **and claims NULL-owner rows** in one `$transaction` — D15/D21 verified end-to-end with a pre-accounts category; later accounts `USER`/`PENDING`; 201 `{ user, message }`, no auto-login); login (identical 401 for unknown/wrong; status gate **after** password verify → 403 pending/declined; success → cookie + `{ user }`); logout → 204; `me` → `{ user }` (re-read from DB) or 401 `Authentication required`. `lib/auth.ts` gained `getSessionUser()` + `requireUser()`/`requireAdmin()` guards (T25–T27 consumers; signed out → 401, session whose status is no longer APPROVED → 403 with the login messages); `UserDTO`/`toUserDTO` never expose `passwordHash`. Evidence: **48/48** curl checks (bootstrap claim, cookie flags HttpOnly/Lax/Path=/ and no Secure in dev, tampered cookie → 401, logout → me 401, deleted-user session → 401, case-variant duplicate → 409, validation 400s incl. non-JSON body); DB left fresh-empty. Gates: 43/43 tests · lint clean · build green. Commit `a04362f`.

#### T24 — Auth UI: `/login` + `/register`
**Status:** ✅ DONE · **Depends on:** T23 ✅ · **Files:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `components/AuthCard.tsx` (shared shell) + new `(app)`/`(auth)` route groups
- `/register`: username, password, confirm (client-side mismatch check), inline server errors. On success show the **approval-pending state** — “Account created — an admin must approve it before you can sign in” + link to `/login`; first-account variant: “Admin account created — sign in to continue”.
- `/login`: username + password, inline errors including the exact 403 PENDING/REJECTED messages, loading/disabled states, link to register.
- Both: centered card, no app nav, minimal chrome; already-signed-in visitors redirect to `/`; keep classes token-friendly (T30/T31 restyle later).
- **Acceptance criteria (SSR + T32 browser):** pages render 200; register flow reaches the pending state; wrong credentials show the error near the form; the first-account variant shows the admin message.
- **Result (2026-10-17):** ✅ Shipped as `app/(auth)/{login,register}` (URLs as planned) with the shared `components/AuthCard.tsx` centered-card shell; to give the auth pages **nav-free chrome** the five app pages moved into an **`app/(app)/` route group** (URLs unchanged) whose layout renders `Nav` + the page container — groundwork for T25's session-aware shell. `LoginForm`/`RegisterForm`: inline errors (`role=alert`) incl. the exact 403 PENDING/REJECTED messages, register's client-side mismatch check, loading/disabled submits, cross-links, and the admin-vs-pending success states with a "Go to sign in" button. Both pages are server components that redirect an APPROVED session to `/`; session reads follow the bundled Cache-Components docs — `export const instant = false` + `await connection()` (the documented fix for the dev-time `Date.now()` prerender insight; the log is now clean). Evidence: **27/27** curl checks — both pages 200 with all fields and **no app nav**, all five app pages still 200 with nav, signed-in GET `/login` + `/register` → **307 → `/`**, logout → pages render again; full browser pass deferred to T32. Gates: 43/43 tests · lint clean · build green (`/login` `/register` ƒ Dynamic). Commit `2645307`.

#### T25 — Route protection + session-aware shell
**Status:** ✅ DONE · **Depends on:** T24 ✅ · **Files:** `proxy.ts` (guard mechanism per the bundled Next docs — `middleware` is renamed **`proxy`** in Next 16; docs read per AGENTS.md), `app/(app)/layout.tsx`, `app/(app)/admin/users/page.tsx`, `components/Nav.tsx`, `lib/auth.ts`
- Signed out: `/`, `/income`, `/expenses`, `/savings`, `/categories` and `/admin/**` redirect to `/login`; `/login` + `/register` redirect to `/` when signed in; `/admin/**` redirects non-admins to `/`.
- Nav: signed-in username + **Log out** button; **Admin** link only for `role=ADMIN`.
- Wire the shared session guard helper for APIs (data routes return **401** `Authentication required`; full roll-out in T26).
- Record the chosen guard mechanism (middleware vs per-layout) in §12.
- **Acceptance criteria:** logged-out visits to every app route redirect; login lands on `/` with username + logout visible; logout returns to signed-out behavior; a non-admin cannot open `/admin/users`; lint/build/test green.
- **Result (2026-10-17):** ✅ Mechanism (recorded in §12): **`proxy.ts`** (Next 16's middleware replacement) does cookie-only optimistic redirects — signed-out hits on `/`, `/income`, `/expenses`, `/savings`, `/categories`, `/admin/**` → `/login` (HMAC check, no DB); secure checks stay close to the data — the `(app)` layout re-reads the session from the DB (missing/non-APPROVED → `/login`) and hands `{ username, role }` to the session-aware `Nav` (username + **Log out** button + **Admin** link only for `role=ADMIN`); a `/admin/users` stub re-checks the role (non-admin → `/`) ahead of T27's real UI; `/login`/`/register` still bounce APPROVED sessions. `instant = false` + `connection()` on the layout/page (dev log clean). Evidence: **31/31** curl checks — all six route patterns 307 → `/login` signed out (tampered cookie too), auth pages exempt, admin sees username/Log out/Admin link and `/admin/users` 200, bob (USER) sees no Admin link and gets 307 → `/`, logout re-locks `/income`, admin session unaffected; DB left fresh-empty. Gates: 43/43 tests · lint clean · build green (app pages now ƒ Dynamic; build lists `ƒ Proxy (Middleware)`). Commit `dfd4981`.

#### T26 — Per-account data scoping (multi-tenancy pass) + seed/README
**Status:** ✅ DONE · **Depends on:** T25 ✅ · **Files:** all `app/api/{categories,incomes,expenses,savings,overview}/**` + `app/api/auth/register/route.ts` (claim removal), `prisma/schema.prisma` + `prisma/migrations/20261017051621_phase2_scoping/`, `prisma/seed.ts`, `README.md`, `app/api/tenancy.test.ts` + `app/api/categories/categories-api.test.ts`
- Every data route: require a session (401 otherwise) and scope all reads/writes to `session.user.id` — categories, incomes, expenses, savings, overview; ownership-check every `categoryId` (another account's id → **404**, never 403/200); per-account Σ% ≤ 100 guard and per-account unique names (composite unique — D16).
- `/api/overview`: income/spent/net-saved/wallet/savings-balance computed **for the session account only** (month + all-time scopes otherwise unchanged).
- Seed: creates one **demo Admin** (credentials documented in README, e.g. `demo` / `demo12345`) and attaches the existing demo dataset to it; still DEV-ONLY + idempotent; wipe order updated (`savingsEntry → expense → income → category → user`).
- README: registration/approval flow, session/`SESSION_SECRET` config row, demo credentials, “auth required” note in the API preamble, Docker `SESSION_SECRET` note.
- Route-level regression tests (fake Prisma, two accounts): A cannot list/read/delete B's rows; cross-account `categoryId` → 404; the same category name is allowed in two accounts; overview isolated.
- **Acceptance criteria:** two accounts on a dev server show fully separate data end-to-end; `npm test` green incl. isolation tests; lint/build green.

**Result (2026-10-17):** ✅ Multi-tenancy pass complete. **Schema:** `userId` tightened to **required** on all four models (relation `onDelete: Cascade`) via migration `20261017051621_phase2_scoping` — a clean SQLite table-redefine applied on the (verified-empty) dev DB; with `userId Int` no NULL-owner row can exist, so the D21 bootstrap claim (`updateMany({ userId: null })`) became dead code and was removed from register (its 4 `tsc` errors confirmed it could never match). **Routes:** all five groups require a session (`requireUser()` → 401 `Authentication required`) and scope every read/write to `session.user.id`; `categoryId` ownership uses scoped `findFirst` so another account's id behaves like a missing one → **404**; Σ% ≤ 100 and duplicate names are per account (D16). **Seed:** wipes users too (`savingsEntry → expense → income → category → user`) and creates a demo **Admin** `demo` / `demo12345` owning the dataset — verified under `tsx` (the `lib/auth` hash import loads fine outside Next). **README:** registration/approval flow ("first account = admin"), new Authentication endpoint section, cookie-required API preamble + 401/403/404/409 error table, demo credentials, per-account wording throughout, updated architecture map + data model. **Tests:** new `app/api/tenancy.test.ts` (12 tests: two accounts × list/create/delete isolation, cross-account `categoryId` → 404, same name in both accounts, overview isolation, 401s) + `categories-api.test.ts` updated for sessions/scoping (13) — **60/60** green. Evidence: **37/37** curl checks on a dev server — two accounts (alice = admin, bob approved) show disjoint categories/incomes/expenses/savings/overview (balances 100000 vs 40000), cross-account deletes/patches → 404, the same name is reusable across accounts, own ops still work, signed-out data APIs 401, dev log clean; DB left fresh-empty. Gates: 60/60 tests · lint clean · build green. Commit `ea3b935`.

#### T27 — Admin approvals (API + `/admin/users` UI)
**Status:** ✅ DONE · **Depends on:** T25 ✅ (T23 provides the account API) · **Files:** `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/{approve,reject}/route.ts`, `app/(app)/admin/users/page.tsx` + `components/AdminUsers.tsx`, `lib/validation.ts`, tests; `components/Nav.tsx` needed no change (Admin link already admin-only since T25)
- API (ADMIN only → 403 otherwise; responses never include `passwordHash`): `GET /api/admin/users?status=PENDING|APPROVED|REJECTED|ALL`; `POST …/[id]/approve` and `…/[id]/reject` — `PENDING` only (already decided → **409** `Registration already decided`), unknown id → 404. Guards: an admin **cannot decide their own account**; an `ADMIN` can never be rejected here (no last-admin lockout).
- UI `/admin/users`: pending registrations first (username, created date, Approve / Reject with a confirm on reject), then all members grouped by status; counts in the header; empty state “No pending registrations”; inline errors. Nav “Admin” link stays admin-only.
- **Acceptance criteria (curl now, browser in T32):** register → appears PENDING → approve → that account can sign in; reject → sign-in shows the declined message; non-admin → 403/redirect; double-decide → 409; SSR checks pass.
- *Note from T21 (2026-10-17) — **resolved by T26**: `userId` was nullable during the rollout; the multi-tenancy pass tightened it to required (`userId Int`, migration `20261017051621_phase2_scoping`) once every route wrote `userId: session.user.id` — §5 target, rationale in §12.*

**Result (2026-10-17):** ✅ **API:** `GET /api/admin/users?status=PENDING|APPROVED|REJECTED|ALL` (default `ALL`, registration order, unknown status → 400) + `POST /…/[id]/{approve,reject}` — both behind `requireAdmin()` (`403 Admin access required`), every row mapped through `toUserDTO` so `passwordHash` never serializes. Guard order (each independently observable): unknown id → **404 User not found** → self-decide → **400 You cannot decide your own account** → (`reject` only) target is ADMIN → **400 Admin accounts cannot be rejected** → status ≠ PENDING → **409 Registration already decided**; a successful decide writes the new status + `decidedAt`. **UI:** the `/admin/users` server page keeps the T25 role re-check (non-admin → `/`, signed-out → `/login`) and now renders `components/AdminUsers.tsx` — pending registrations first (username, registered date, **Approve** / **Reject** with a confirm; buttons disabled while saving), then Approved/Declined groups with Admin badges, a "(you)" marker on the admin's own row and decided dates; counts chip in the header; empty state "No pending registrations"; inline errors; one `?status=ALL` fetch grouped client-side. **Evidence:** **14** new route-level tests (74/74 total: 401/403 matrix, status filter, 409/404/400 guards, no-hash-leak) + **47/47** curl checks — register → PENDING visible → approve → bob signs in (USER, 403 on admin APIs, SSR `/admin/users` 307 → `/`), reject → carol's login shows the declined message, double-decide 409, self-decide/reject-admin 400s, ssr signed-out 307 → `/login`, hash never present in any payload, dev log clean; DB left fresh-empty. Gates: 74/74 tests · lint clean · build green. Commit `e4c1cb1`.

#### T28 — Overall Wallet balance (API + dashboard card)
**Status:** ✅ DONE · **Depends on:** T26 ✅ · **Files:** `lib/wallet.ts` + `lib/wallet.test.ts` (new), `app/api/overview/route.ts`, `lib/types.ts`, `app/(app)/page.tsx`, `app/api/tenancy.test.ts`, `README.md`
- Formula (D18, per account): `walletBalanceCents = Σ all-time income − Σ all-time expenses − (Σ deposits − Σ withdrawals)` — cash on hand; **negative allowed** (shown red like the savings card); computed live, never stored.
- Extend `/api/overview` with additive `walletBalanceCents` (all-time, independent of `month`); update the README payload sample.
- Dashboard: new **“Wallet balance”** summary card (sub-line “All-time · cash not spent or saved” — copy may be tuned in T30), placed so the five cards wrap responsively (grid tweak).
- Tests: formula unit tests (withdrawals return cash; negative case) + curl reconciliation — income 5000 − spent 200 − savings net 800 → **4000**, cross-checked against the Income/Expenses/Savings tabs of the same account.
- **Acceptance criteria:** wallet reconciles after adds/deletes (no stored drift); an empty account shows ₱0.00; lint/build/tests green.

**Result (2026-10-17):** ✅ `lib/wallet.ts` holds the formula as a pure function (`walletBalanceCents({ incomeCents, expenseCents, depositCents, withdrawalCents })`), unit-tested (5 new tests). `/api/overview` adds two all-time aggregates (`income`/`expense` `_sum`) and reuses the existing all-time savings `groupBy` for the savings side — additive `walletBalanceCents`, month-independent, per account (the same groupBy pass now also derives `savingsBalanceCents` from deposit/withdrawal sums). Dashboard: **Wallet balance** card between Net saved and Savings balance (sub-line "All-time · cash not spent or saved", red when negative); the card grid is now `sm:2 → lg:3 → xl:5` so five cards wrap without an orphan. `OverviewResponse` typed + README sample/semantics/feature bullet updated. Evidence: **18/18** curl checks — the documented reconciliation 5000 − 200 − 800 = **4000** cross-checked against the same account's Income/Expenses/Savings payloads, month switch leaves the wallet unchanged, live drift after deleting the expense (4200), withdrawal returns cash (4500), deposit deletion → savings −300 / wallet 6300, negative wallet (−200) with the dashboard SSR rendering the card, bob's empty account = **0** while alice stays negative, dev log clean; DB left fresh-empty. Gates: 79/79 tests · lint clean · build green. Commit `f0099c4`.

#### T29 — Multi-select category filters (Expenses, Savings, Dashboard)
**Status:** ✅ DONE · **Depends on:** T26 ✅ · **Files:** `app/api/{expenses,savings}/route.ts`, `lib/validation.ts` + `lib/validation.test.ts` (new), `app/(app)/{expenses,savings}/page.tsx`, `app/(app)/page.tsx`, `components/CategoryMultiSelect.tsx` (new), `app/api/tenancy.test.ts`, `README.md`
- Semantics (D19): multi-select, OR-combined, per account — API `?categoryIds=1,2,3` on Expenses and Savings GET (malformed ids → 400; unknown ids simply match nothing). Dashboard filters rows **client-side** (data is already loaded) so summary cards stay account-wide.
- Expenses: the single `categoryId` select becomes a multi-select (checkbox dropdown or toggle chips) + “Clear”; the list and the live “N expenses · Total” line follow the selection.
- Savings: same control for SAVINGS-kind categories; the history list follows it and **`monthNetCents` is computed over the selected categories**; all-time `balanceCents` stays account-wide (document it).
- Dashboard: filter rows by kind and/or selected categories; summary cards unchanged. Income tab: no category dimension — explicitly out of scope.
- Tests: CSV parsing (valid / malformed / empty → all), route regression with two categories selected.
- **Acceptance criteria:** selecting Needs + Wants on Expenses shows only those categories' rows with a matching total; savings month net follows the selection; dashboard rows filter; API tests green.

**Result (2026-10-17):** ✅ API: `?categoryIds=1,2,3` on Expenses + Savings GET (replaces the old single `?categoryId=` — D19; rationale in §12), parsed by the new `parseCategoryIdsParam` (absent/empty → all; de-dupes; any non-positive/non-numeric entry → 400 `categoryIds must be a comma-separated list of positive integers`). Unknown-but-well-formed ids match nothing, and the filter is ANDed with `userId`, so another account's ids simply return empty (never 403/leak). Savings: the filter joins `monthWhere`, so both the entries list **and `monthNetCents`** follow it — `balanceCents` stays account-wide. UI: new shared `components/CategoryMultiSelect.tsx` (toggle chips, `All` indicator, `Clear` button, optional color dots + hint text) wired into Expenses (list + live total follow), Savings (list + month net follow; the hint spells out the account-wide balance) and the Dashboard (client-side row filter; **summary cards untouched**; `No categories match the current filter.` when empty). Dashboard kind filtering is achieved through the category chips (the spec's "and/or"). Tests: `lib/validation.test.ts` (5 CSV cases) + tenancy additions (OR list, empty → all, unknown → none, malformed → 400, cross-account ids → empty, savings net-vs-balance) — **87/87**. Evidence: **27/27** curl checks — Needs-only rows sum 3500, `?categoryIds=` → all, unknown → 0, three malformed variants → 400, Fun-only net 5000 vs balance 7000, bob filtering by alice's ids → 0 expenses/entries, SSR smoke on both pages + dashboard; dev log clean; DB left fresh-empty. Gates: 87/87 tests · lint clean · build green. Commit `1b6e8fc`.

#### T30 — UI polish pass (token layer, components, empty states)
**Status:** ✅ DONE · **Depends on:** T29 ✅ · **Files:** `app/globals.css`, `app/layout.tsx`, all `app/**/page.tsx`, `components/*.tsx`
- Introduce a small **token layer** (CSS variables: surface / surface-muted / text / text-muted / border / accent / success / danger + radii/spacing) consumed via Tailwind utilities — this is the single palette T31 flips for Night mode.
- Consistent typography hierarchy, buttons/inputs/badges/cards, focus-visible rings, hover/disabled/loading states, friendlier empty + error states, responsive audit (cards stack, lists scroll on mobile).
- **No functional changes** — behavior and tests stay identical.
- **Acceptance criteria:** every screen visually consistent in light mode; lint/build/tests green; no flow regressions (T32 browser pass).

**Result (2026-10-17):** ✅ Token layer in `app/globals.css`: semantic variables (`--surface`, `--surface-muted`, `--ink`, `--ink-muted`, `--line`, `--accent`/`--accent-hover`/`--on-accent`, `--success`/`--warning`/`--danger` each with `-soft`/`-border`) exposed to Tailwind utilities via `@theme inline` — T31 now only overrides variables under `.dark`. Radii get `--radius-control`/`--radius-panel` tokens (spacing keeps Tailwind's native `--spacing` scale — see §12). All 14 screens/components migrated off raw palette utilities: **370** replacements, verified by a scanner that reports **0** leftovers. Duplicated per-page constants collapsed into shared `.btn-primary`/`.btn-secondary`/`.btn-danger`/`.field` component classes; a new `.alert-danger|warning|success` + `.badge*` vocabulary unifies every error/success/pending/category-kind state (auth forms, load/action errors, admin statuses, income chips, dashboard kind chips); keyboard focus is one global `:focus-visible` outline instead of drifting per-element rings. One migration bug (`bg-red-500` shadowed by the `bg-red-50` rule → `bg-danger-soft0` in ProgressBar) was caught in review and fixed. **No functional changes** — behavior, copy and tests identical: **87/87** tests · lint clean · build green · tsc clean; **41/41** acceptance checks (built CSS carries the token layer + component classes; SSR pages render token classes with zero legacy utilities; every screen 200 with a session; DB fresh-empty). Visual consistency across screens is verified in the T32 browser pass. Commit `79795e8`.

#### T31 — Night mode
**Status:** ✅ DONE · **Depends on:** T30 ✅ · **Files:** `app/globals.css`, `app/layout.tsx`, `components/ThemeToggle.tsx` (new), `components/Nav.tsx`, `components/AuthCard.tsx`, `README.md`
- Theme: **Light / Dark / System** (default System); toggle in the nav and reachable from `/login` / `/register`; persisted in `localStorage` (key e.g. `st-theme`).
- **No flash of the wrong theme:** a tiny inline script sets the `dark` class on `<html>` before first paint; wire Tailwind v4's dark variant for the class strategy (check the installed Tailwind v4 setup in `globals.css`).
- Audit every surface in dark: nav, cards, forms, badges/chips, progress bars, signed amounts (green/red contrast), over-budget red, empty states, auth cards.
- **Acceptance criteria (browser, T32):** toggle switches instantly and persists across reloads; system preference respected; no FOUC on hard reload; all pages checked in both themes.

**Result (2026-10-17):** ✅ Tailwind v4 class-strategy variant wired via `@custom-variant dark (&:where(.dark, .dark *))`; the `.dark` block re-points every T30 token — page = darkest layer (`--surface-muted` slate-900), cards/nav one step up (slate-800), **inverted accent** (slate-100 chip + slate-900 text so primary buttons and the active nav pill keep maximum contrast), success/warning/danger pairs retuned to dark softs (300-level text on 900/950-level fills), and `color-scheme` flips light/dark so native controls (incl. the date pickers) follow. New `components/ThemeToggle.tsx`: Light/Dark/System segmented control (default **System**) in the nav and on both auth cards; preference persisted in `localStorage` under `st-theme`, exposed through a tiny external store + `useSyncExternalStore` (server snapshot `system` ⇒ hydration renders the server markup, no mismatch; the store also avoids the repo linter's ban on effect-`setState`) with a live `matchMedia` listener while System is active. **No-FOUC:** inline `THEME_SCRIPT` in the root layout `<head>` reads `st-theme` and sets the `dark` class + `data-theme` **before first paint** (check asserts the script precedes `<body>` in the SSR HTML); `<html>` declares `suppressHydrationWarning`, and the toggle re-applies the stored theme in `useLayoutEffect` so dev Strict-Mode remounts cannot strip the class (per the bundled "preventing flash before hydration" guide). Dark audit is variable-level — nav, cards, forms, chips/badges, progress bars, signed amounts, over-budget red, empty states and auth cards all flip with the token change — with a single variant use (`dark:shadow-none` on the auth card). README: feature bullet, walkthrough step 8, architecture map. Gates: **87/87** tests · lint/build/tsc green · **23/23** acceptance checks (CSS `.dark` block + a compiled `dark:` rule, head-script ordering, control on auth + nav, every screen 200); DB fresh-empty. Instant switching, persistence and FOUC-free reloads are browser-verified in the T32 pass. Commit `54609b9`.

#### T32 — Phase 2 QA / end-to-end verification
**Status:** ✅ DONE · **Depends on:** T21–T31 · **Files:** this file (Work Log + QA section) — no source changes (QA role boundary)
- Mirror T16: flow matrix — register → approve → sign in per account; A/B isolation probes (lists, cross-account ids, overview); wallet reconciliation; multi-select filters; both themes; admin guards (non-admin 403, self-decide blocked, double-decide 409); session edge cases (tampered/expired cookie, logout); seed with the demo user; Docker image re-check incl. `SESSION_SECRET`.
- Gates: `npm test`, `npm run lint`, `npm run build` + browser suite on the dev server and the production image; DB restored to fresh-empty afterwards; QA reports defects → PM queues fixes as T33+ (same convention as T17/T18).
- **Acceptance criteria:** checklist logged with pass/fail; gates green; Work Log entry added; QA section updated by the QA agent.

**Result (2026-10-17):** ✅ Round-3 independent verification on `105d39c` (full matrices + defect log in §Senior QA). Gates: **87/87 tests (9 files) · lint clean · build green (21/21)**. API suite **199/199** on dev and **199/199** against the production image (`192 PASS + 7 KNOWN-BUG` documenting the new BUG-QA-05). Real-browser suites (system Edge headless): dev **76/76 + 1 KNOWN-BUG (BUG-QA-03)** · image **75/75 + 2 KNOWN-BUG** — **BUG-QA-04 reproduced 4/4 in production** (after sign-in the app stays on `/login` until a manual reload; High). Seed verified end-to-end: demo admin `demo`/`demo12345`, counts 1/4/2/4/1, idempotent re-run, `NODE_ENV=production` refused with exit 1, API wallet **₱4,710.00** (= 6,200 − 490 − 1,000). Docker: `SESSION_SECRET` hard requirement (no-secret container fails login signing with **500** + the D17 fail-fast log; `/login` still 200), data survives `docker restart`, cookie flags `Secure; HttpOnly; SameSite=lax; Max-Age=2592000` confirmed. **Three defects logged → queued T33+:** BUG-QA-04 (High — prod sign-in stays on `/login`), BUG-QA-03 (Low–Med — pre-hydration submit leaks credentials into the URL, dev+prod), BUG-QA-05 (Low — prod page redirects are soft `200 + NEXT_REDIRECT`). Final state: dev DB **0/0/0/0**, dev server stopped, Docker container/bind-dir/image removed; QA scripts/reports/shots live outside the repo under `AppData\Local\Temp\opencode\` (`package.json` untouched — D11).

#### T33 — Fix the T32 QA defects (BUG-QA-04 · BUG-QA-05 triage · BUG-QA-03)
**Status:** ✅ DONE · **Depends on:** T32 ✅ · **Files:** `components/LoginForm.tsx`, `components/RegisterForm.tsx`, `components/AuthCard.tsx`, `lib/use-hydrated.ts` (new), `app/(app)/layout.tsx`, `README.md`
- **Defects (from QA — repros + suggested specs in §Senior QA → Defect log):** **BUG-QA-04** (High) production sign-in stays on `/login` until a manual reload — the signed-out `/login` brand-link prefetch of `/` caches the soft-redirect RSC payload, which the post-login `router.replace("/")` then reuses; **BUG-QA-05** (Low) production page-level redirects arrive as soft `200 + NEXT_REDIRECT` instead of `307` — triage; **BUG-QA-03** (Low–Med) a submit before hydration falls back to a native GET, putting username/password (`confirm` too) into the URL.
- **Fixes:** **04** — post-sign-in navigation is a hard document load (`window.location.replace("/")`, always follows the fresh cookie, drops `/login` from back history) and the AuthCard brand link is `prefetch={false}` so the stale signed-out payload is never seeded; **03** — new `lib/use-hydrated.ts` (`useSyncExternalStore`, server snapshot `false`) keeps both auth submits **disabled until hydration**, and both forms declare `method="post"` so even a pre-hydration Enter submit POSTs to the page route (re-rendered `200`, URL unchanged, body ignored) instead of a native GET; **05** — **accepted + documented** (README → Run with Docker + `(app)` layout comment): the soft form is inherent to the fork's production postponed/prerender streaming, responses are `no-store` with no protected content, browsers still land on the target, dev keeps hard 307s, and the proxy's signed-out app-route guard already redirects hard.
- **Acceptance criteria:** production browser replay — UI sign-in lands on `/` with no manual reload (QA `G2`); pre-hydration click inert + URL stays clean (`A13`); native `POST /login|/register` leaks nothing into the URL; gates green; DB fresh-empty.
- **Result (2026-10-17):** ✅ all fixes applied and verified — commit `7827dd4`. Gates **87/87 tests · lint clean · build/tsc green**. **Dev acceptance 16/16** (SSR forms carry `method="post"` + disabled submits; native POST re-renders the page with no redirect and no credential echo; register/login/dashboard regression 201/200/200; signed-in `/login` stays hard 307 in dev; proxy guard 307). **Production (standalone server :3001 — the image's output):** same form facts; signed-in `/login` → `200` soft (`x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`, `private, no-cache, no-store`, body `NEXT_REDIRECT`, **no login form** — BUG-QA-05's documented form confirmed); signed-out `/` → hard `307 → /login`. **Edge-headless browser replay on the production build (QA tooling, no repo deps): 6/6** — zero `/?_rsc=` prefetches from signed-out `/login`; sign-in lands on `/` + Dashboard (G2 replay); pre-hydration submit disabled → forced click cannot navigate, URL stays `/login`, form signs in once hydrated (A13 replay). **Closed by QA round 4 (2026-10-17): all three defects re-verified on the rebuilt image — see §Senior QA → Defect log.**

---

### Phase 3 backlog — UI refresh & PWA (T34–T40)

> **Planned:** 2026-10-21 (PM v3; decisions D22–D26 confirmed with the user the same day). **Phase 1 + Phase 2 are complete and deployed; Phase 3 starts at T34.** Execution order: **T34 → T35 → T36 → T37 → T38 → T39 → T40**. T38 depends only on T34 but follows the sequential protocol. Same rule as above: never start a task whose dependencies are not ✅.

#### T34 — Design system v2 + shared primitives
**Status:** ✅ DONE · **Depends on:** T33 ✅ · **Files:** `package.json`, `app/globals.css`, `app/layout.tsx`, `components/{PageHeader,Skeleton,Toaster,ConfirmDialog,MonthPicker}.tsx`
- Extend the T30/T31 token layer (D22): emerald `--brand*` pair (light/dark), `--surface-raised`, `--overlay`, elevation tokens, 6-color chart palette, larger radii; keep the existing semantic names working. Retune `.btn-primary`/active nav to the brand accent; add `.money` (`font-variant-numeric: tabular-nums`) and a shared `.card`/panel treatment. Audit contrast in both themes.
- Add **`lucide-react`** (allowed by D11) with a small icon vocabulary for nav, stat cards, actions, empty states and the install/offline UI.
- Build shared primitives: `PageHeader` (title/description/actions), `Skeleton`, `ToastProvider` + `useToast` (portal, `role=status|alert`, auto-dismiss), `ConfirmDialog` + `useConfirm` (native `<dialog>`, focus return, Escape/backdrop), `MonthPicker` (prev/next/today, `aria-live` label). Mount `ToastProvider` in the root layout.
- No API or data changes. Do not migrate page layouts yet beyond what the primitives require.
- **Acceptance criteria:** `npm test` / lint / build green; tokens + primitives compile and render in light/dark; focus-visible and reduced-motion respected; no raw palette utilities added outside the token layer; `lucide-react` is the only new runtime dependency.
- **Result (2026-10-21):** ✅ Token layer v2 ships an emerald brand pair (light/dark), raised surface + overlay, elevation/radius tokens and a 6-colour chart palette while keeping the existing semantic names. Added `lucide-react@^1.61.0` (the only new runtime dependency, allowed by D11) behind a curated `lib/icons.ts`; shared `PageHeader`, `Skeleton`, `ToastProvider`/`useToast`, native-`<dialog>` `ConfirmDialog`/`useConfirm`, and `MonthPicker`. Toast provider is mounted in the root layout. Gates green; both themes verified in the T40 browser pass.

#### T35 — App shell + responsive navigation
**Status:** ✅ DONE · **Depends on:** T34 ✅ · **Files:** `components/AppShell.tsx` (new), `components/Nav.tsx` (replaced), `app/(app)/layout.tsx`, `components/ThemeToggle.tsx`
- Desktop (`lg+`): fixed left sidebar with brand mark, icon+label nav, active pill, **Admin** link only for admins, an install slot (wired in T38), theme control, and username/logout at the bottom.
- Mobile: compact top bar (brand + overflow menu for theme/install/admin/logout) and a **fixed bottom tab bar** with five destinations — Dashboard, Income, Expenses, Savings, Categories — using `env(safe-area-inset-bottom)` and 44px touch targets. Content gets matching bottom padding.
- Keep the `(app)` session guard, `proxy.ts` matcher and all URLs unchanged. Content container becomes `max-w-6xl`; no horizontal scroll at 320px.
- **Acceptance criteria:** 320/390/768/1024/1440 layouts have no wrapping/overflow; active state matches every route; admin link hidden for USER; logout works; keyboard focus reaches every nav item; both themes; gates green.
- **Result (2026-10-21):** ✅ `AppShell` provides the fixed desktop sidebar (brand, icon+label destinations, active pill, admin-only link, install slot, theme switch, username/logout) and the mobile top bar + fixed five-tab bottom bar (safe-area padding, 44px targets) with an overflow menu. `(app)`/`(auth)` layouts and all URLs/guards are unchanged; content is `max-w-6xl`. T40 browser checks passed at 320/390/768/1024/1440 with no horizontal overflow, correct active state, USER without the admin link, and working logout.

#### T36 — Dashboard 2.0 + trend API
**Status:** ✅ DONE · **Depends on:** T34 ✅, T35 ✅ · **Files:** `app/api/overview/route.ts`, `lib/types.ts`, `lib/dates.ts` (reuse), `app/api/tenancy.test.ts` + route tests, `app/(app)/page.tsx`, `components/{AllocationDonut,TrendChart,StatCard}.tsx`
- Extend `GET /api/overview` with optional **`?trend=N`** (D25): integer 1–12 (malformed/out-of-range → 400); build N UTC month buckets ending at the selected month (oldest first); one scoped query per data table; add `trend: [{ month, incomeTotalCents, spentCents, netSavedCents }]`; **absent param → payload unchanged**. `spentCents` = expenses only; `netSavedCents` = deposits − withdrawals.
- Tests: N-month sequence + year boundary, zero-data months, malformed/0/13 → 400, cross-account isolation, existing overview assertions unchanged.
- Dashboard: wallet balance **hero** (gradient/dark surface, red when negative), stat cards with icons and month-over-month deltas (from `trend`), **allocation donut** from `categories.allocatedCents` (+ neutral unallocated slice) with legend, **6-month grouped income-vs-spent bars** with an accessible table/summary, and category status cards (progress, plan %, remaining/over, On track / Near limit / Over badge).
- Keep T29 filter semantics: chips filter category rows only; cards/donut/trend stay account-wide. Loading skeletons replace text; empty states for no categories/income.
- **Acceptance criteria:** all figures reconcile with the Income/Expenses/Savings tabs; trend hand-checked for 6 months incl. a year boundary; without `?trend` the payload is byte-for-byte compatible with the old shape; both themes + 390px; gates green.
- **Result (2026-10-21):** ✅ `GET /api/overview?trend=N` (1–12) returns N UTC month buckets ending at the selected month (oldest first, zero-filled) and rejects malformed/out-of-range values with `400 trend must be an integer between 1 and 12`; absent param leaves the payload unchanged. Four route tests cover sequence/year boundary, zero months, isolation and validation; a compact chart-label helper was unit-tested. Dashboard 2.0 ships the wallet hero, stat cards with deltas, SVG allocation donut, 6-month grouped bars with accessible tables, and category status cards. T40 checks reconciled the figures against the tab APIs; both themes and 390px passed.

#### T37 — Page refresh + modern interactions
**Status:** ✅ DONE · **Depends on:** T34 ✅, T35 ✅, T36 ✅ · **Files:** `app/(app)/{income,expenses,savings,categories}/page.tsx`, `app/(app)/admin/users/page.tsx`, `app/(auth)/{login,register}/page.tsx`, `components/{IncomeForm,ExpenseForm,SavingsForm,CategoryEditor,AdminUsers,AuthCard,EmptyState,CategoryMultiSelect,ProgressBar}.tsx`
- Apply the new visual language to every remaining screen: `PageHeader`, cards, responsive list rows, tabular amounts, status badges, consistent empty states with icons.
- Move add-income/expense/savings forms into a **centered modal on desktop / bottom sheet on mobile** opened from the page-header CTA (D26). Reuse the existing submit handlers, validation and error copy; close on success and show a toast. Categories keep inline create/edit (styled).
- Replace every `window.confirm` with `useConfirm`; add success/error toasts; replace remaining `Loading…` with skeletons. Keep delete blocking/error behavior identical.
- Auth pages: split-screen brand panel on desktop, centered card on mobile; keep `method="post"`, hydration-disable and `window.location.replace("/")` from T33. Admin approvals get the same dialogs/toasts.
- Subtle page/list motion (CSS + React 19.3 `ViewTransition` where supported), all disabled under `prefers-reduced-motion`.
- **Acceptance criteria:** every existing flow still works end-to-end (create/list/delete, filters, categories CRUD, admin approve/reject, login/register/logout); no `window.confirm` or text-only "Loading…" left; dialogs are keyboard/Escape/focus-return accessible; toasts announced; both themes + 390px; no console errors; gates green.
- **Result (2026-10-21):** ✅ All list pages, categories, admin, and auth screens were rebuilt on the new primitives. Add income/expense/savings now open in `FormDialog` (centered modal at `sm+`, bottom sheet on phones) with the existing handlers/copy; categories stay inline. Every `window.confirm` is replaced by `useConfirm`; action results use toasts; text loading is replaced by skeletons; empty states/filters/progress bars are shared components; auth uses the split-screen brand panel while keeping T33's hydration guard, `method="post"` and hard post-login navigation. T40's 97-check browser pass covered every flow, dialog keyboard/Escape/focus return, both themes and mobile with zero console errors; `grep` confirms no `window.confirm` or text-only loading remains.

#### T38 — PWA installability (manifest, icons, install UX)
**Status:** ✅ DONE · **Depends on:** T34 ✅ · **Files:** `app/manifest.ts`, `app/layout.tsx` (metadata/viewport), `public/icons/*`, `components/InstallPrompt.tsx`, `next.config.ts`, `README.md`
- Add `app/manifest.ts` (D23): name/short name/description, `id`/`start_url`/`scope` `/`, `display: "standalone"`, `orientation: "any"`, `background_color`/`theme_color`, `categories: ["finance","productivity"]`, shortcuts to `/income`, `/expenses`, `/savings`, and icons 192/512 + maskable 512 + Apple 180. Generate the PNGs once from the SVG mark (one-off tooling; **no `sharp` dependency in `package.json`**) and commit them under `public/icons/`.
- Root layout: `appleWebApp` metadata (`capable`, title, status bar) and `viewport` with light/dark `themeColor`, `viewportFit: "cover"`, `width=device-width`. Keep zoom enabled.
- `InstallPrompt`: capture `beforeinstallprompt`, shared store so the sidebar and mobile menu can both trigger it; iOS Safari gets the “Share → Add to Home Screen” dialog; hide when standalone/installed; `appinstalled` toast. Register nothing yet (SW lands in T39).
- `next.config.ts`: correct `Content-Type` + `Cache-Control: no-cache` for the manifest; add the `/sw.js` header block in T39.
- **Acceptance criteria:** manifest fetches 200 with valid JSON and every icon 200 at the declared size; SSR head carries the manifest link + Apple/theme metadata; install UI appears only when installable (or iOS) and hides when standalone; gates green.
- **Result (2026-10-21):** ✅ `app/manifest.ts` declares standalone display, `/` start/scope, finance/productivity categories, shortcuts to Income/Expenses/Savings and 192/512/maskable-512/Apple-180 icons generated once from the SVG mark by `scripts/generate-icons.py` (no `sharp`/canvas dependency). Root metadata adds `appleWebApp`, `themeColor` (light/dark), `viewportFit: cover`; `InstallPrompt` captures `beforeinstallprompt` through a shared store for the sidebar/mobile menu, shows iOS Share → Add to Home Screen steps, hides when standalone and toasts on `appinstalled`. `next.config.ts` serves the manifest and icons with correct types/cache headers. Production checks: manifest 200 valid JSON, all icons 200 at declared sizes, head metadata present, install affordance only when installable.

#### T39 — Offline fallback + service worker
**Status:** ✅ DONE · **Depends on:** T38 ✅ · **Files:** `public/sw.js`, `app/offline/page.tsx`, `components/{PwaRegister,OfflineBanner}.tsx`, `lib/use-online.ts`, `next.config.ts`, `app/layout.tsx` / `app/(app)/layout.tsx`
- **`public/sw.js` (hand-written, D24):** versioned cache; precache `/offline`, PWA icons and the manifest; install → activate cleanly; fetch handler — navigations network-first → cached `/offline`, `/_next/static/**` + icons cache-first, **all `/api/**`, HTML/RSC and cross-origin requests pass through** (never cached); delete old caches; `SKIP_WAITING` message support.
- **`app/offline/page.tsx`:** public, themed, nav-free offline page with a Retry button and the app brand; no auth calls/data.
- **`PwaRegister`:** register `/sw.js` **only in production** (`NODE_ENV === "production"`), `updateViaCache: "none"`, detect a waiting worker and show an “Update available — Refresh” toast that activates it and reloads once.
- **`OfflineBanner`:** `useSyncExternalStore` over `online`/`offline` events (server snapshot online); banner under the shell; no caching of account data.
- `next.config.ts`: `/sw.js` served with `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /` (and the PWA CSP note if headers are added).
- **Acceptance criteria:** on a **production build**, the SW is active; a signed-in offline reload lands on `/offline`; Cache Storage contains **no `/api/**`, HTML or RSC** entries; reconnecting resumes normal data loads; an update deploys and the toast/reload path works; dev (`next dev`) behaves unchanged; Docker image still boots; gates green.
- **Result (2026-10-21):** ✅ Hand-written versioned `public/sw.js` precaches only `/offline`, the PWA icons, manifest and hashed `/_next/static/**`; navigations are network-first → `/offline`, API/HTML/RSC/cross-origin requests pass through, old caches are deleted and `SKIP_WAITING` is supported. `/offline` is public/themed/nav-free with **Try again**; `PwaRegister` registers only in production and shows the **Update available — Refresh** toast; `OfflineBanner` uses `useOnline` with an online server snapshot. Verified with the real server stopped (offline navigation/reload/retry) and a v1→v2 update (toast → Refresh → one reload → only `savings-tracker-v2`). Cache inspection: **27 entries, 0** `/api`, RSC or non-offline HTML. SW headers: `no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /`. Dev stays unaffected.

#### T40 — Phase 3 QA, docs, and deployment
**Status:** ✅ DONE · **Depends on:** T34–T39 ✅ · **Files:** `Project_state.md`, `README.md`, `deployment_plan.md`; small fixes only (non-trivial defects → queue T41+)
- Gates: full `npm test`, lint, build, tsc; existing API/browser suites re-run against the new UI.
- Real-browser QA (desktop + 390px mobile, light/dark): every flow, nav/sidebar/bottom tabs, dialogs/toasts/skeletons, charts, filters, admin guards, register/login/logout; no console/server errors.
- PWA QA: manifest/icons, SW registration, offline reload, cache inspection (no API/account data), update flow, iOS instructions, standalone metadata; Lighthouse for performance/accessibility (PWA behavior verified by browser automation/DevTools).
- Docker build/run + Railway deploy; live probes (`/login` 200, `/` 307, API 401, manifest/SW/icons 200, HTTPS); verify installability on the live URL. Restore the dev DB to its prior state.
- Docs: README UI tour + PWA install/offline privacy note; `deployment_plan.md` deploy/update note; Work Log + QA section. Any real defect becomes T41+ with repro/acceptance.
- **Acceptance criteria:** all gates green; browser + PWA matrices logged pass/fail; live deployment verified; no account data cached; docs and status updated.
- **Result (2026-10-21):** ✅ Final gates: **93/93 tests** · lint clean · `tsc --noEmit` clean · `npm run build` green. Production-browser QA: **97/97 checks, 0 failed, 0 console errors/exceptions** across auth, dashboard, income/expenses/savings/categories, admin approve/reject, non-admin shell, dialogs/toasts/confirms, both themes, 320/390/768/1024/1440, PWA metadata/SW/cache. Phase 2 API suite on the production build: **192 PASS / 0 FAIL / 7 KNOWN-BUG** (all documented BUG-QA-05 soft redirects). Lighthouse mobile: `/login` **99/100/100/100**, authenticated `/` **96/100/100/100** (performance/accessibility/best-practices/SEO). Docker `savings-tracker:t40` built from this revision; fresh-volume boot applied all migrations, `/login` 200 · `/` 307 · API 401 · manifest/SW/offline/icons 200, first-user admin + category create worked and survived `docker restart`. T40 fixes: peso form prefixes via `currencySymbol()`, peso auth copy, amount-field autofocus priority, 320px overflow (sr-only table wrappers + MonthPicker label), `OfflineRetry` full navigation, labelled `ProgressBar`s and toast `role="region"`. README UI tour/PWA privacy + API trend docs and `deployment_plan.md` updated; Railway redeploy verified (see its §9). Dev DB restored from the pre-QA backup; test server/container/Chrome stopped.

---

### 9. Definition of done (every task)

- All acceptance criteria met.
- `npm run build` and `npm run lint` pass; `npm test` passes once tests exist.
- Data persists across a server restart; no unhandled console/server errors.
- UI/PWA tasks: both themes and a 390px mobile viewport checked; PWA work verified against a production build (`next build && next start`), **never** `next dev`.
- Task status, Work Log, and **Next up** updated in this file (§10).
- (Recommended) one git commit: `Txx: <title>`.

### 10. Update protocol (every agent, before ending a session)

1. Set the task's **Status** to ✅ DONE (or ⛔ BLOCKED with a one-line reason).
2. Update **Next up** at the top to the first task that is not ✅ and whose dependencies are all ✅.
3. Update **Progress:** (Phase 1 `done/20` · Phase 2 `done/13` · Phase 3 `done/7`) and **Last updated:** date.
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
| 2026-10-17 | T15 | Full-stack Developer | DEV-ONLY idempotent `prisma/seed.ts` (wipes + 4 categories 35/25/20/20, 2 incomes, 4 expenses, 1 deposit; production guard); full README (setup, optional seed, scripts, architecture, money rules); polish: custom `app/icon.svg` (default favicon removed), `vitest.config.mts` (ESM warning gone), lint clean. 40/40 script checks PASS (fresh-empty → seed → numbers → re-seed idempotency → wipe); lint+build green; commit `2f4add3`. |
| 2026-10-17 | T16 | Senior QA | E2E verification pass on the T15 revision: `npm test` 22/22 · lint clean · build green; API suite 181/181 PASS (S0 + F1–F8 + E1–E8 + validation/month/negative/delete + X1–X3/X6/X7 extras) with 8 observations; seed 12/12 + idempotent + production guard; real-browser (system Edge headless via playwright-core, run from a temp dir — no repo deps) 54/54 PASS incl. every item previously "Deferred to QA" and the over-budget visuals; **2 defects logged → T17/T18** (BUG-QA-01 Σ=100.01% accepted; BUG-QA-02 kind change silently drops spent). Full matrices + defect log in §Senior QA. DB left empty; dev server stopped. |
| 2026-10-17 | T17 | Full-stack Developer | Tightened both Σ% guards `> 10001` → `> 10000` (D5; BUG-QA-01). Added 8 route-level regression tests driving the handlers with a fake Prisma (vitest now resolves the `@/*` alias). HTTP replay: 400 `(would be 100.01%)`, boundaries 100.00/99.99 correct. Commit `5ecab99`. |
| 2026-10-17 | T18 | Full-stack Developer | PATCH now counts the **current** kind's entries on kind change → 409 D9-style (`Cannot change kind: … — delete them first`); safe kind change + name/%/color edits still 200. Replay: `spentCents` unchanged (20000), savings-side variant blocked. Commit `5ecab99`. |
| 2026-10-17 | T19 | Full-stack Developer | Currency USD → PHP (user decision, answers Q1): `APP_CURRENCY="PHP"` → `₱1,234.56`; only the constant + test expectations changed (T04 one-switch design). Commit `2940322`. |
| 2026-10-17 | T20 | Full-stack Developer | Docker support: multi-stage standalone image + isolated Prisma CLI stage, entrypoint `migrate deploy → node server.js`, absolute `/app/data/dev.db` + volume; `.dockerignore` + README. `docker build` + `docker run` verified end-to-end (migrate, CRUD, PHP bundle, restart persistence). Commit `d0c4b3a`. |
| 2026-10-17 | T17–T20 | Senior QA | Re-verification round 2: gates `npm test` 30/30 · lint clean · build green; API suite **197/197** (X1/X2 probes upgraded to hard assertions for both fixed defects) · lib checks all PASS (₱) · seed 12/12 + idempotent · real-browser 54/54 on dev server and 54/54 on the production Docker image · over-budget 3/3 · Docker in-container 15/15 + restart persistence. **BUG-QA-01/BUG-QA-02 verified fixed and closed.** DB wiped (0/0/0/0), dev server stopped, Docker artifacts removed. Details in §Senior QA. |
| 2026-10-17 | PM | Project Manager | PM v2: added the **Phase 2 backlog (T21–T32)** — admin-approved accounts with per-account data (T21–T27), Overview **Wallet balance** (T28), **multi-select category filters** (T29), **UI polish + Night mode** (T30–T31), Phase 2 QA (T32). Superseded D2; new decisions D14–D21 (user answered Q4–Q7 the same day). Next up: **T21**. Housekeeping: repaired `node_modules/next` (left broken by an interrupted install — `npm install`) and verified the build. |
| 2026-10-17 | T21 | Full-stack Developer | Auth data model: `User` (+ username/role/status/decidedAt) and `userId` FK/index on all four data models, `Category.name` → `@@unique([userId, name])`; migration `20261017044443_phase2_accounts` applied on the empty dev DB (5 tables, 0 users); gates green (30/30 tests) + fresh-DB end-to-end smoke 14/14; nullable-during-rollout call logged in §12 (**T26 tightens**). Commit `3070c50`. |
| 2026-10-17 | T22 | Full-stack Developer | Auth core: `lib/auth.ts` — scrypt hashing (salted, timing-safe) + `st_session` HMAC-SHA256 tokens (30 d, httpOnly/Lax/Secure-in-prod; prod fails fast without `SESSION_SECRET`, dev fallback + warning) + async cookie helpers per the bundled Next 16 `cookies()` docs; 13 unit tests (tamper/expiry/wrong-secret/malformed). Gates 43/43 · lint · build green; `.env.example` + README (`SESSION_SECRET` row + Docker `-e` note). Commit `3ac82e2`. |
| 2026-10-17 | T23 | Full-stack Developer | Auth API: register (admin bootstrap D15 — first account ADMIN/APPROVED + NULL-row claim; else USER/PENDING; 409 case-variant dupes; 400 validation), login (401 identical / 403 pending·declined / cookie on success), logout 204, me; `requireUser`/`requireAdmin` + `getSessionUser` guards; `UserDTO`. 48/48 curl checks (claim, cookie flags, tamper, deleted-user, logout) · gates 43/43 · DB left fresh-empty. Commit `a04362f`. |
| 2026-10-17 | T24 | Full-stack Developer | Auth UI: `(auth)` group with `/login` + `/register` (AuthCard shell; forms with inline errors, mismatch check, loading states, pending/admin success states) over a new `(app)` route group that keeps the nav off auth pages; signed-in visits redirect via `getSessionUser()` (`instant = false` + `await connection()` per the bundled Cache-Components docs — dev `Date.now()` insight gone). 27/27 curl checks · gates 43/43 · build green. Commit `2645307`. |
| 2026-10-17 | T25 | Full-stack Developer | Route protection + session-aware shell: `proxy.ts` (Next 16 middleware rename) optimistic cookie-only redirects for the six app route patterns; `(app)` layout DB-session check + `Nav` with username/Log out/Admin-link-for-admins; `/admin/users` stub with role guard (real UI in T27). 31/31 curl checks (signed-out 307s, tampered cookie, non-admin 307s → /) · gates 43/43 · build green (`ƒ Proxy (Middleware)`). Commit `dfd4981`. |
| 2026-10-17 | T26 | Full-stack Developer | Per-account scoping: required `userId` (migration `20261017051621_phase2_scoping`, clean empty-DB redefine; D21 claim path closed + removed from register) and every data route session-guarded (`requireUser` 401) + `session.user.id`-scoped (cross-account ids → 404; per-account Σ%/names); seed wipes users + demo Admin `demo`/`demo12345`; README auth section/flow/credentials/per-account model. New tenancy suite (12) + categories suite updated (13). Evidence: 37/37 two-account curl checks (disjoint lists/balances/overview; bob cannot touch alice's rows), 60/60 tests · lint clean · build green; DB left fresh-empty. Commit `ea3b935`. |
| 2026-10-17 | T27 | Full-stack Developer | Admin approvals: ADMIN-only `GET /api/admin/users?status=` (default ALL, registration order, no hash leak) + `POST [id]/{approve,reject}` (404 unknown → 400 self-decide → 400 admin-cannot-be-rejected → 409 already-decided; success sets `decidedAt`); `/admin/users` real UI — pending first with Approve + confirm-Reject, Approved/Declined groups (Admin badge, "(you)", decided dates), header counts, "No pending registrations" empty state, inline errors. 14 new tests (74/74) + 47/47 curl checks (approve→sign-in, reject→declined message, non-admin 403 + SSR 307, double-decide 409); DB fresh-empty. Commit `e4c1cb1`. |
| 2026-10-17 | T28 | Full-stack Developer | Wallet balance (D18): `lib/wallet.ts` pure formula + 5 unit tests; `/api/overview` adds `walletBalanceCents` (all-time income − expenses − savings net; two new `_sum` aggregates, month-independent, per account); dashboard Wallet balance card (red when negative) in a responsive 5-card grid; README sample/semantics. 18/18 curl checks (5000−200−800→4000 reconciliation, live deletes/withdrawals, negative case, empty account 0, isolation); 79/79 tests · lint clean · build green; DB fresh-empty. Commit `f0099c4`. |
| 2026-10-17 | T29 | Full-stack Developer | Multi-select category filters (D19): `?categoryIds=` CSV (OR, empty = all, malformed → 400, unknown → nothing, per account) on Expenses + Savings GET; Savings month net follows the filter while `balanceCents` stays account-wide; shared `CategoryMultiSelect` toggle-chip component (All/Clear, colors, hint) on Expenses, Savings + Dashboard rows (client-side, cards unchanged). 5 unit + 3 tenancy tests added (87/87) + 27/27 curl checks; README endpoint docs + walkthrough; DB fresh-empty. Commit `1b6e8fc`. |
| 2026-10-17 | T30 | Full-stack Developer | UI polish, no behavior change: semantic token layer in `globals.css` (CSS variables → `@theme inline` utilities + control/panel radii), every screen migrated off raw slate/white/red/green/amber utilities (370 replacements, 0 leftovers), shared `.btn-*`/`.field`/`.alert-*`/`.badge*` component classes replace duplicated constants, global `:focus-visible` ring; caught + fixed a `bg-danger-soft0` migration typo. 87/87 tests · lint/build/tsc green · 41/41 curl checks (built CSS carries the layer, SSR pages token-only, all screens 200); DB fresh-empty. Commit `79795e8`. |
| 2026-10-17 | T31 | Full-stack Developer | Night mode: Tailwind v4 `@custom-variant dark` + `.dark` token overrides (layered surfaces, inverted accent, dark-tuned success/warning/danger, `color-scheme`); new `ThemeToggle` (nav + auth cards) persisting `st-theme` via `useSyncExternalStore` + live OS listener; no-FOUC inline `<head>` script (asserted before `<body>`), `suppressHydrationWarning`, pre-paint re-apply for dev remounts. 87/87 tests · lint/build/tsc green · 23/23 curl checks; README feature/walkthrough/map; DB fresh-empty. Commit `54609b9`. |
| 2026-10-17 | T32 | Senior QA | Phase 2 E2E verification (round 3) on `105d39c`: gates 87/87 (9 files) · lint clean · build green (21/21); API suite 199/199 on dev and 199/199 (192 + 7 KNOWN-BUG=BUG-QA-05) on the production image; real-browser (system Edge headless) 76/76 dev (+1 KNOWN-BUG=Bug-QA-03) · 75/75 image (+2 KNOWN-BUG; BUG-QA-04 reproduced **4/4** — prod sign-in stays on `/login` until a reload); seed demo ₱4,710.00 + idempotent + production guard; Docker no-secret fail-fast (D17) + restart persistence + `Secure` cookie flags. **3 defects queued T33+** (BUG-QA-04 High · BUG-QA-03 Low–Med · BUG-QA-05 Low). DB wiped 0/0/0/0; dev server stopped; Docker artifacts removed; reports/scripts/screenshots in AppData; docs committed. |
| 2026-10-17 | T33 | Full-stack Developer | Round-3 QA defect fixes: BUG-QA-04 — post-sign-in `window.location.replace("/")` (bypasses the poisoned router cache) + `prefetch={false}` on the AuthCard brand link; BUG-QA-03 — new `useHydrated()` keeps both auth submits disabled until hydration + `method="post"` native fallback (pre-hydration Enter POSTs to the page route, URL clean); BUG-QA-05 — triaged, accepted + documented (fork's prod streaming, `no-store`, no protected content; README + layout comment). Evidence: 87/87 tests · lint/build/tsc green · dev checks 16/16 · production standalone: soft-redirect form confirmed, credential-safe native POST + SSR form facts · Edge-headless replay 6/6 (G2 + A13). DB fresh-empty. Commit `7827dd4`. |
| 2026-10-17 | T33 (QA round 4) | Senior QA | Re-verification on `7827dd4`: gates **87/87 · lint clean · build green (21/21)**; API **199/199** dev · **192 + 7 documented (BUG-QA-05)** image; browser **81/81 dev · 81/81 image — 0 KNOWN-BUG** (`A13*`/`G2` xfails promoted to hard assertions; new `A13c`/`A13d` SSR facts + `G2b` prefetch check). **BUG-QA-03/04 verified fixed and closed; BUG-QA-05 accepted-as-documented with QA concurrence** — soft-redirect body re-probed (`no-store`, 0 password inputs), signed-out `/` hard 307. Incidental: zombie-`<main>` observation O3 obsolete (`C1d` 1/1). Infra: the first image-API run was **voided** by a stale `:3001` next-server (T33 session leftover) → reclaimed + targeting proven (`probe-which-db.sh`) + re-run. Final: dev DB 0/0/0/0 · server stopped · Docker artifacts removed · ports free. Docs committed. |
| 2026-10-19 | Deploy | Infra Agent | **Live:** https://savings-tracker-production-e934.up.railway.app — Railway Free (project `precious-hope`, service `savings-tracker`, volume `savings-tracker-volume` @ `/app/data` 500 MB, serverless on, region iad). Dockerfile `VOLUME` instruction removed (Railway bans the keyword during build validation; storage attaches at runtime). Verified: gates re-run 87/87 · lint · build; live probes `/login` 200 · `/` 307 · API 401; first-signup admin `zanesonsona`; throwaway registration → PENDING → rejected by admin → login 403 "declined" (approval flow e2e); restart test boot **2→3** ("No pending migrations to apply") → DB persisted on the volume; first backups downloaded + `integrity_check=ok` (pre- and post-restart). Backup script `~/savings-backups/backup.sh` (tested, keeps 14 newest). Docs: `deployment_plan.md` v3. Commits `60ab2e5`, `fc09bb4`, `df122a3`. |
| 2026-10-21 | PM | Project Manager | PM v3: added **Phase 3 — UI refresh & PWA** (T34–T40): design tokens/shared primitives, responsive app shell, dashboard 2.0 + additive 6-month trend API, page refresh with modal/sheet forms + toasts, installable PWA, offline fallback without caching financial data, QA/deploy. New user-confirmed decisions D22–D26; scope, API contract, business rules and DoD updated. Next up: **T34**. |
| 2026-10-21 | T34 | Full-stack Developer | Design system v2: emerald brand + raised/overlay/elevation/radius/chart tokens; `lucide-react@^1.61.0` (only new runtime dep) behind `lib/icons.ts`; `PageHeader`, `Skeleton`, `Toaster`/`useToast`, native `<dialog>` `ConfirmDialog`/`useConfirm`, `MonthPicker`; ToastProvider in root layout. No API/data changes; gates green. |
| 2026-10-21 | T35 | Full-stack Developer | Responsive `AppShell`: fixed desktop sidebar (brand/nav/active pill/admin-only link/install slot/theme/user/logout) + mobile top bar and fixed five-tab bottom bar with overflow menu, safe-area padding and 44px targets; `(app)`/`(auth)` layouts rewired, URLs/guards unchanged, content `max-w-6xl`. 320/390/768/1024/1440 verified. |
| 2026-10-21 | T36 | Full-stack Developer | Overview API `?trend=1–12` (UTC buckets ending at month, oldest first, 400 on malformed/out-of-range; absent = unchanged payload) + 4 route tests and compact-label helper; Dashboard 2.0 with wallet hero, delta stat cards, SVG allocation donut, 6-month grouped trend and category status cards, all with accessible table fallbacks. |
| 2026-10-21 | T37 | Full-stack Developer | Full page refresh: `FormDialog` modal/bottom-sheet income/expense/savings forms, inline category editor, styled `ConfirmDialog` everywhere (`window.confirm` gone), toasts, skeleton loading, shared empty states/filters/progress bars, split-screen auth keeping T33 guards. All CRUD/filter/admin/login flows preserved; no text-only loading left. |
| 2026-10-21 | T38 | Full-stack Developer | Installable PWA: `app/manifest.ts` (standalone, shortcuts, categories), 192/512/maskable/Apple icons generated from the SVG mark via `scripts/generate-icons.py`, root `appleWebApp`/theme/viewport metadata, shared `beforeinstallprompt` store + iOS instructions, manifest/icon headers. Production checks: manifest + icons 200 at declared sizes, head metadata present. |
| 2026-10-21 | T39 | Full-stack Developer | Offline fallback: hand-written versioned `public/sw.js` (precache `/offline`, icons, manifest, hashed statics only; network-first navigations; never `/api`, HTML/RSC or account data), public `/offline`, production-only `PwaRegister` with Update-available toast/Refresh, `OfflineBanner`/`useOnline`; SW headers. Real-server-offline + v1→v2 update flows verified; cache 27 entries / 0 bad; dev unchanged. |
| 2026-10-21 | T40 | Senior QA / Full-stack Developer | Phase 3 QA + deploy: gates **93/93 tests · lint · tsc · build**; production-browser **97/97, 0 console errors** (all flows, both themes, 320/390/768/1024/1440, PWA/offline); API suite **192 PASS + 7 documented BUG-QA-05**, 0 fail; Lighthouse **99/96 performance, 100 a11y/BP/SEO**; Docker build/boot/persistence + Railway redeploy verified. Fixes: peso form prefixes/auth copy, autofocus priority, 320px overflow, OfflineRetry, labelled progress/toast region. README/deployment docs updated; dev DB restored. |

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
- 2026-10-17 · T15 · Replaced the create-next-app `app/favicon.ico` with a custom **`app/icon.svg`** (slate rounded square + green trend line) and renamed `vitest.config.ts` → **`vitest.config.mts`** · reason: own-brand tab icon (title already "Savings Tracker"); the `.mts` extension clears Vite's ESM-in-CJS configLoader warning without touching behavior.
- 2026-10-17 · T15 · Seed dates are **relative to the run date** (`currentMonth()` / `shiftMonth(-1)`): income day 01 + 3 expenses + 1 deposit this month, income day 15 + 1 expense last month; seed refuses to run when `NODE_ENV=production` · reason: demo data must land in the month the dashboard opens on; the guard keeps the destructive wipe out of production.
- 2026-10-17 · T16 · QA **reports defects, does not fix them** (user instruction); the two non-trivial findings are queued as T17/T18 with suggested fixes + acceptance criteria for the dev · reason: keeps the QA/dev role split clean; defects are re-verified by QA after the fixes (Q7/Q8).
- 2026-10-17 · T16 · Σ = 100.01% judged a **defect against D5** even though T05's literal text said reject `> 100.01` · reason: locked decisions beat ambiguous task text; evidence is the broken money math (allocations 500050¢ > income 500000¢, `unallocatedCents` −50) — a data-integrity break, not rounding tolerance.
- 2026-10-17 · T16 · Real-browser evidence produced with `playwright-core` + the installed **system Edge (headless)** run from a Windows temp dir; **no repo dependencies added** · reason: keeps D11 (`package.json`/`node_modules`) untouched while still testing the actual UI.
- 2026-10-17 · T16 · Final QA state per D3: DB wiped to fresh-install (0/0/0/0) and dev server stopped; all QA scripts/reports/screenshots live outside the repo (`AppData\Local\Temp\opencode\qa*`) · reason: clean handoff, no parallel tracking files in the project.
- 2026-10-17 · T17/T18 · Fixes implemented exactly as QA scoped them (guards `> 10000`; kind-change 409 counting the **current** kind's entries) + **route-level regression tests** (`categories-api.test.ts`) driving `POST`/`PATCH` directly with a fake in-memory Prisma (vitest config now resolves the `@/*` alias) · reason: the bugs are HTTP-boundary behavior; tests stay DB-less/hermetic and `npm test` grew 22 → 30 tests.
- 2026-10-17 · T19 · **PHP** per user instruction (resolves Q1); locale kept `en-US` (Intl output identical to `en-PH`: `₱1,234.56`) · reason: literally a one-constant switch (T04 design); date formatting untouched (out of scope).
- 2026-10-17 · T20 · Docker base `node:24-bookworm-slim` + **standalone output** + **isolated Prisma CLI stage** (installs the lockfile's exact CLI version) · reason: the first attempt copying only `node_modules/prisma` + `node_modules/@prisma` failed at container start (`Cannot find module 'effect'` — CLI transitive dep); the isolated install is complete and version-pinned without shipping devDependencies.
- 2026-10-17 · T20 · DB at **absolute** `file:/app/data/dev.db`, `VOLUME /app/data`, entrypoint runs `migrate deploy` on every start · reason: relative SQLite URLs are resolution-dependent and `prisma/` is not part of the standalone trace; absolute + volume is restart/upgrade safe, and a fresh volume still starts empty (D3).
- 2026-10-17 · T20 · Docker **engine installed in WSL via apt solely to verify** the image (no Docker existed in this environment); test container/volume/image removed afterwards and host `prisma/dev.db` wiped · reason: end-to-end evidence for the deliverable; same system-install pattern as T01 (Node/git via apt as root); no repo file depends on the local Docker install.
- 2026-10-17 · T17/T18 · QA upgraded the API suite's X1/X2 sections from **observations to hard assertions** encoding the fixed behavior (400 / 409 / invariants) and re-ran every suite · reason: an observation documents a defect once; an assertion protects the fix against regressions forever.
- 2026-10-17 · T19 · QA suite currency expectations switched `$` → `₱` via a scoped transform (only a `$` directly before a digit, plus one escaped regex literal) across the browser/over-budget/lib scripts · reason: keeps every display assertion meaningful after PHP instead of deleting them; `QA` scripts still live outside the repo, `package.json` untouched (D11).
- 2026-10-17 · T20 · QA **re-built and re-ran the Docker image** (as root: `wsl -u root` — the daemon was already installed by the dev but user `zane` lacks the `docker` group): fresh-volume boot, in-container T17/T18 replays (15/15), the full browser suite against the production container (:3001, 54/54), restart persistence; container/volume/image removed after · reason: independent end-to-end evidence for the production artifact rather than trusting the dev's log.
- 2026-10-17 · T21 · **`userId` shipped nullable** (optional `User` relation) on all four data models instead of §5's required target · reason: required `userId` fails `tsc` at the 5 pre-auth create sites — the categories/incomes/expenses/savings POSTs + the DEV seed, **18 errors in the kept probe** — and no user row can exist before T23 (D3/D15: fresh install = 0 users). This follows **D21's safe sequence**: nullable → the **first Admin claims** NULL-owner rows at bootstrap (T23) → **T26 tightens to required** once every route writes `userId: session.user.id`. Side benefit: the migration is also safe on a dev DB that still holds pre-account rows (the SQLite redefine copies them with a NULL owner — no reset needed). Transitional nuance: SQLite treats NULLs as distinct inside `@@unique([userId, name])`, so duplicate category names remain blocked only by the existing API check until T26 scopes names per account.
- 2026-10-17 · T25 · **Guard mechanism: `proxy.ts` + close-to-data checks.** Next 16 renamed `middleware` → **`proxy`** (verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`); `proxy.ts` (root) runs **optimistic** redirects using only the cookie + HMAC verification (**no DB**): signed-out hits on `/`, `/income`, `/expenses`, `/savings`, `/categories`, `/admin/**` → `/login`. The **secure** checks stay close to the data per the auth guide: the `(app)` layout re-reads the session from the DB (missing/non-`APPROVED` → `/login`), `/admin/users` re-checks `role`, auth pages redirect `APPROVED` sessions to `/` (server-side), and data APIs adopt `requireUser()` in T26. The proxy deliberately does **not** bounce signed-in users away from `/login`/`/register`: it cannot see role/status without a DB lookup, and a naive redirect would loop with the layout's non-APPROVED check (REJECTED session: proxy → `/`, layout → `/login`, …). Session-reading pages/layouts also declare `export const instant = false` + `await connection()` — the documented Cache-Components migration path for request-time session reads (the `Date.now()` inside `verifySessionToken` otherwise trips the dev prerender insight; logs are clean with it).
- 2026-10-17 · T26 · **`userId` tightened to required; the D21 claim path removed.** Migration `20261017051621_phase2_scoping` (SQLite table-redefine, applied on the verified-empty dev DB) closes the nullable window: with required `userId` nothing can write a NULL owner, which made the register route's bootstrap claim (`updateMany({ userId: null })`) dead code — deleted along with its comment. · reason: completes the T21→T23→T26 sequence exactly as designed (D21); keeping a claim query that can never match is a `tsc` error (4 of them) that falsely implies a state the schema forbids.
- 2026-10-17 · T26 · **Tenancy tests stay route-level and hermetic:** the two-account suite drives the real handlers with a mocked `next/headers` cookie jar handing out **real signed `st_session` tokens** plus a fake in-memory Prisma serving two accounts — SQLite is only touched by the curl e2e. Cross-account ids are asserted as **404** (never 403), since 403 would confirm the row exists. · reason: matches the T17/T18 fake-Prisma pattern; the HTTP boundary (status + message + scoping) is what regressions hit, while `lib/auth.test.ts` covers the crypto and the curl pass covers the DB.
- 2026-10-17 · T27 · **Decide-guard order + status codes:** unknown id → 404; self-decide → 400 `You cannot decide your own account`; `reject` on an ADMIN → 400 `Admin accounts cannot be rejected`; non-PENDING → 409 `Registration already decided` — evaluated in exactly that order so each guard is independently observable. · reason: the spec fixed 404/409/messages but not the self/admin-reject statuses; 400 means "invalid operation for this target" (403 would wrongly imply the caller lacks the role), and checking the role before the status keeps `Admin accounts cannot be rejected` from being masked by the already-decided 409 (an admin is always APPROVED). Banning admin rejects makes a last-admin lockout impossible by construction — no counting logic needed.
- 2026-10-17 · T27 · **Admin UI groups client-side from one `?status=ALL` fetch** while the `status` filter stays server-side for API consumers · reason: the header counts need every status anyway, so three filtered fetches would be waste; grouping this tiny list is trivial and a single refetch after each decide keeps all sections atomic.
- 2026-10-17 · T29 · **`?categoryId=` was replaced, not aliased, by `?categoryIds=`** on Expenses GET · reason: D19 fixes one param shape; keeping both invites drift and doubles docs/tests, and the only consumers are the in-repo UI (updated the same commit) and README — a local single-app API has no external contract to preserve. Unknown-but-valid ids deliberately return an empty list instead of 404: the filter is a query selector, not a resource lookup.
- 2026-10-17 · T29 · **Savings filter scope split:** `categoryIds` narrows the month's entries **and** `monthNetCents`, but never `balanceCents` · reason: per the T29 spec — a partially-filtered "balance" would read as a savings total while silently excluding rows; the UI hint and README both state the balance is account-wide. The Dashboard chips are the only purely client-side filter (rows only), because its payload is already month/account-scoped and the summary cards must stay unfiltered.
- 2026-10-17 · T30 · **Error/status states use one shared component vocabulary** (`.alert-danger|warning|success`, `.badge*`) and keyboard focus is one global `:focus-visible` outline instead of per-element rings · reason: the spec asks for consistent buttons/inputs/badges/states; a single vocabulary is the only way T31's dark-mode audit stays small, and per-element focus classes were already drifting (some elements had `focus:border-*`, others nothing). Button sizing stays explicit at call sites (`w-full`, `mt-4`) on top of the `.btn-*` classes.
- 2026-10-17 · T30 · **Only radii get custom variables (`--radius-control`/`--radius-panel`); spacing keeps Tailwind's native `--spacing`** · reason: the spec's "radii/spacing" is satisfied by Tailwind v4's built-in spacing token (every step derives from one `--spacing` value), so a parallel scale would create two sources of truth; radii had two visually meaningful buckets (controls vs panels) worth naming for the T31 audit.
- 2026-10-17 · T31 · **Theme persistence stays in `localStorage` (`st-theme`), never a request cookie** · reason: the spec names localStorage, and a cookie would only help the server pre-render the theme — reading it in the root layout opts the entire app out of static prerendering (bundled flash guide); the inline head script gets the identical no-FOUC result without touching rendering strategy. The control's state lives in a `useSyncExternalStore`-backed store (server snapshot `system`) rather than effect-`setState`: hydration renders the server snapshot (mismatch-free) and the repo's react-compiler lint rule rejects synchronous `setState` inside effects.
- 2026-10-17 · T31 · **Dark palette layers page-darkest / cards-one-step-up and inverts the accent** · reason: light mode's relational logic is "cards lighter than page"; dark keeps the same elevation reading (slate-900 page, slate-800 cards) with zero class changes, and an inverted accent (slate-100 surface + slate-900 text via `--on-accent`) keeps primary buttons and the active nav pill at maximum contrast instead of letting a near-black button disappear into the dark surfaces.
- 2026-10-17 · T32 · Round-3 real defects are recorded as **xfail-style KNOWN-BUG entries** in the suites (browser `A13` → BUG-QA-03, browser `G2` → BUG-QA-04, API `P7`–`P20b` → BUG-QA-05) instead of hard failures · reason: the suites must stay green and repeatable on both targets while still documenting every defect; a red suite masks new regressions, and QA is report-only — the defect log in §Senior QA carries repro + suggested specs for T33+.
- 2026-10-17 · T32 · The Docker round runs against a **bind-mounted DB at `/home/zane/qa-t32-data`** (moved out of `/root`, which user `zane` cannot traverse) so the WSL-side `db-tool.ts` (the API suite's DB ops) and the container share one file · reason: the API suite needs direct DB manipulation (wipe / status / role / create+delete user) and `/root` is mode 0700 — unreachable for the suite's user; the container's `node` uid (1000) matches `zane`, so file ownership stays clean for both sides.
- 2026-10-17 · T32 · BUG-QA-05 classified **Low + likely inherent to this fork's production streaming** rather than app code: production flushed/prerendered shells (headers `x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`) mean a page-component `redirect()` arrives as 200 + a client-executed `NEXT_REDIRECT;…;307` in the body instead of a hard 307; probed with curl AND node-fetch, dev vs image, browser-like headers included — **no protected content in those bodies and `no-store`**, so no leak/UX impact · reason: keeps dev expectations strict (the API suite only tolerates the soft form under `QA_PROD=1` and still fails it in dev) while the image report stays meaningful; fix-or-document stays with the T33+ triage.
- 2026-10-17 · T33 · **Post-login navigation is a hard document load** (`window.location.replace("/")`) instead of `router.replace("/")`, plus `prefetch={false}` on the auth brand link · reason: BUG-QA-04's mechanism is the router cache holding the signed-out `/` soft-redirect payload; a full load is immune to any stale entry, and `replace()` also keeps `/login` out of the back history. `assign()` would trip the `@next/next/no-location-assign-relative-destination` lint rule; `replace()` is unflagged — and hard navigation is deliberate here because client routing is exactly what the production cache poisoned.
- 2026-10-17 · T33 · **Pre-hydration submit guarded twice: disabled button + `method="post"` fallback** (new `lib/use-hydrated.ts`, `useSyncExternalStore` with server snapshot `false` — the `lib/use-today.ts` pattern) · reason: BUG-QA-03's repro is a click before hydration; disabling the submit covers clicks (and its SSR markup is asserted), while `method="post"` covers Enter-key/native submissions a disabled button cannot stop — the browser then POSTs to the page route, which this fork re-renders with `200` (verified: no redirect, body ignored, no credential echo, URL unchanged). Chose the dual guard over form actions so the plain-HTML fallback is inert with zero behavior change after hydration.
- 2026-10-17 · T33 · **BUG-QA-05 accepted as documented behavior, no code change** · reason: QA's own round-3 analysis ties the soft `200 + NEXT_REDIRECT` to the fork's production postponed/prerender streaming (the shell flushes before `redirect()` resolves), so no page-level construct can guarantee a 3xx; moving guards into `proxy.ts` would not help the DB-dependent checks (proxy is deliberately cookie-only, and bouncing signed-in cookies away from `/login` would loop with the layout's status check — see T25). Responses are `no-store` with no protected content and browsers execute the redirect; documented in the README (Docker section) + a layout comment, and the QA suite keeps its `QA_PROD=1` tolerance.
- 2026-10-17 · T33 · **Round-4 QA: the xfail-style KNOWN-BUG entries for BUG-QA-03/04 were promoted to hard assertions** (browser `A13` → `A13`/`A13b`/`A13c`/`A13d` + `G2`/`G2b`), while BUG-QA-05 keeps its documented `QA_PROD=1` tolerance · reason: the fixes landed, so the suites must now *fail* if either bug reappears; the A13 probe additionally drives click + Enter + native `requestSubmit` (not just the old click) so every native path is covered. BUG-QA-05 stays tolerated **only because it is accepted-as-documented**, keeping the image report meaningful while dev stays strict.
- 2026-10-17 · T33 · **Image-suite runs must prove their target before being cited as evidence** — the first round-4 image-API attempt was **voided**: a stale `next-server` left on `:3001` by the T33 verification session answered the HTTP calls (against the dev DB) while the suite's DB ops wrote the bind mount, producing a wall of bogus failures (`AD18 len=6`, dev ids) · reason: lost ~10 min to a silent mis-target that superficially looked like real regressions; the re-run encoded the lesson — `reclaim-3001.sh` kills any `:3001` listener (never `:3000`, wiping out only the squatter), the container is recreated on a fresh bind dir, and `probe-which-db.sh` proves HTTP :3001 writes the bind DB (register → id 1 → present only there) before any suite runs. Re-run criteria documented in the artifacts table.
- 2026-10-21 · T34 · **Native `<dialog>` for confirms and form modals**, with `FormDialog` owning only the shell (centered at `sm+`, bottom sheet below) while pages keep their existing submit handlers/state · reason: the platform supplies focus trapping, Escape/backdrop and top-layer rendering without a UI dependency (D11/D22); keeping handlers in the pages preserves every T05–T29 API/data semantic and its error copy (D26).
- 2026-10-21 · T36 · **`?trend=N` is strictly additive and optional**, built from one scoped query per table over a single UTC range and zero-filled in memory · reason: the existing payload must stay byte-compatible for all consumers while the dashboard gets its 6-month series in one request; zero-filling avoids N queries and keeps the year-boundary/sequence logic testable.
- 2026-10-21 · T38 · **PWA icons are generated once by `scripts/generate-icons.py` (Python/Pillow-free PNG encoder) and committed as static files**; no `sharp`/canvas dependency enters `package.json` · reason: T38 explicitly forbids a build-time image dependency (D11); generated 192/512/maskable/Apple PNGs are deterministic and can be regenerated from `app/icon.svg` when the brand mark changes.
- 2026-10-21 · T39 · **Service worker cache policy is allow-list based**: only `/offline`, PWA icons, the manifest and hashed `/_next/static/**` are cached; navigations are network-first, and `/api/**`, RSC/HTML and cross-origin requests are never stored · reason: D24's privacy rule is a security property, not an optimization — a deny-list can miss a new route, while an allow-list cannot. Offline QA must **stop the real server**; CDP's offline emulation does not block the worker's own fetches and can produce a false pass.
- 2026-10-21 · T40 · **Small QA fixes stayed in T40**: `currencySymbol()` so form prefixes follow `APP_CURRENCY` (peso, not `$`), amount-field autofocus ahead of the close button, sr-only chart tables wrapped in `div.sr-only` + narrower `MonthPicker` label for 320px, labelled `ProgressBar`s and a `role="region"` toast container. `OfflineRetry` uses a **full navigation** (`window.location.assign("/")`) because client routing cannot invoke the SW's offline fallback; the lint rule is suppressed with that rationale. · reason: all are cosmetic/a11y/offline-shell fixes within T40's "small fixes only" scope; no API or money math changed.
- 2026-10-21 · T34–T40 · **Delivered as one Phase 3 commit rather than seven task commits** · reason: T34–T39 are a single interdependent refactor (shared primitives/shell/charts/forms/PWA all touch the same pages and layout); reconstructing seven commits after the fact would produce intermediate revisions that do not compile, which is worse than D12's explicitly optional per-task recommendation. The Work Log still records each task separately.

### 13. Open questions (for the human)

- **Q1 — Currency/display locale:** ✅ **Answered 2026-10-17 — PHP.** Implemented in T19: `APP_CURRENCY = "PHP"`, amounts display as `₱1,234.56` (still integer cents under the hood).
- **Q2 — Recurring salary:** MVP = one entry per paycheck, no auto-repeat. Confirm if you want monthly recurrence as a later feature.
- **Q3 — Editing entries:** MVP = create + delete only. Confirm if quick edit of past income/expenses is needed soon.
- **Q4 — Wallet balance meaning:** ✅ **Answered 2026-10-17 — cash on hand** (income − expenses − savings net; savings stay visible on the Savings card). → D18 / T28.
- **Q5 — Category filter style:** ✅ **Answered 2026-10-17 — multi-select flat categories** (e.g. Needs + Wants together; no group model). → D19 / T29.
- **Q6 — Admin bootstrap:** ✅ **Answered 2026-10-17 — first sign-up becomes Admin** (auto-approved); later registrations need approval. → D15 / T23.
- **Q7 — Data scope per account:** ✅ **Answered 2026-10-17 — everything separate per account**; the Admin never sees other accounts' money data. → D16 / T21 + T26.
- **Q8 — Account rules (defaults):** username 3–30 chars, unique case-insensitively; password ≥ 8 chars (D14). Override here if you want different rules.
- **Q9 — Phase 3 direction (UI + PWA):** ✅ **Answered 2026-10-21** — refined-fintech UI, allocation donut + 6-month trend, modal/sheet add-forms, installable PWA with **offline fallback only** (no financial data cached), fixed mobile bottom tabs. → D22–D26 / T34–T40.

---

## Full-stack Developer

> Per-task implementation notes, maintained by the Full-stack Developer agent so QA can verify each task against §8. Last updated: 2026-10-21 · Latest: T40 (Phase 3 complete — implementation evidence for T34–T39 lives in the PM task results, the T40 QA matrix and §12).

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

### T15 — Seed script + README + polish ✅
- **Commit:** `2f4add3 T15: seed script + README + polish`
- **Files:**
  - `prisma/seed.ts` — **DEV ONLY** (aborts when `NODE_ENV=production`), idempotent (wipes `expense → savingsEntry → income → category` first): categories Bills 35 / Needs 25 / Debts 20 (EXPENSE) + Savings 20 (SAVINGS) with colors; 2 incomes (5000.00 salary on the 1st of the current month, 1200.00 freelance on the 15th of the previous month); 4 expenses (200.00 Bills / 80.00 Needs / 150.00 Debts this month + 60.00 Needs last month); 1 deposit (1000.00 Savings, day 2). Dates relative to the run date (`currentMonth()`/`shiftMonth(-1)`); logs counts.
  - `README.md` — replaced the create-next-app boilerplate: overview + features, tech-stack table, prerequisites, setup steps (install → `.env` → `db:migrate` → `dev`), "starts empty" note (D3), optional DEV-only seed section, scripts table (`dev`/`build`/`start`/`lint`/`test`/`test:watch`/`db:migrate`/`db:seed`/`db:studio`), architecture map, money/data rules summary.
  - `app/icon.svg` (new) + `app/favicon.ico` (removed) — custom tab icon (slate rounded square, green trend line); `/icon.svg` serves 200 and builds as ○.
  - `vitest.config.ts` → `vitest.config.mts` — clears Vite's ESM/configLoader warning.
  - Polish sweep verified in earlier tasks: submit buttons have disabled + "Saving…" states (categories/income/expenses/savings), inline errors near forms, title "Savings Tracker" (layout), `npm run lint` clean.
- **Verification evidence:** 40/40 script checks PASS against `npm run dev`: fresh (wiped) DB → `/api/categories` = `[]` and `/` 200 with `<title>Savings Tracker</title>` (app starts empty, D3); `npm run db:seed` exit 0 with summary log → categories exactly `Bills/35/EXPENSE/#ef4444`, `Needs/25/EXPENSE/#3b82f6`, `Debts/20/EXPENSE/#f59e0b`, `Savings/20/SAVINGS/#22c55e`; 1 current-month income, 3 current-month expenses, 1 savings entry with balance 1000.00; dashboard payload matches the demo (Bills 175000/20000/155000, Needs remaining 117000, Debts 85000, Savings remaining 0 & progress 1, spent 43000, net saved 100000, balance 100000); **re-running the seed leaves counts identical (4/2/4/1 → idempotent)**; wipe restores `[]`. `npm test` exit 0, 3 files/22 tests pass, and the `configLoader` warning is **absent** (verified). lint + build exit 0 (`/icon.svg` ○ static).
- **Acceptance criteria (§8 T15):** ✅ fresh setup following the README renders the onboarding empty state (empty DB + API `[]` + `Loading…` SSR verified here; the rendered onboarding card itself is the QA browser pass) · ✅ `npm run db:seed` produces demo data (values + idempotency verified) · ✅ lint + build green.
- **Handoff note for QA (T16):** the DB is left **empty** (post-wipe); `npm run db:seed` is available for a quick demo dataset. Remaining unverified-here items are all browser-visual (client-rendered lists/chips/bars, modals, navigation) — see the per-task "Deferred to QA" notes above.

### T17 + T18 — QA defect fixes ✅
- **Commit:** `5ecab99 T17+T18: fix QA defects — strict Σ% guard + kind-change block + regression tests`
- **Files:**
  - `app/api/categories/route.ts` + `app/api/categories/[id]/route.ts` — Σ% guards tightened from `> 10001` to `> 10000` (BUG-QA-01; Σ = 100.00 exactly stays allowed, 100.01 is rejected with the same `(would be X%)` message). PATCH `findUnique` now includes `_count`; when a **kind change** is requested, the count of the *current* kind's entries is checked → **409** `Cannot change kind: this category has N expense(s)/savings entry(ies) — delete them first` (BUG-QA-02; D8/D9-style).
  - `app/api/categories/categories-api.test.ts` (new) — 8 regression tests that call the real route handlers against a **fake in-memory Prisma**: 0.01% at Σ=100 → 400 (+ exact message); Σ=100.00 boundary valid; 99.99 + 0.01 → 201; PATCH to 100.01 → 400; kind change with entries → 409 (entries untouched); without entries → 200; edits on used categories → 200.
  - `vitest.config.mts` — resolves the `@/*` alias so tests import app modules exactly as Next does.
- **Verification evidence:** `npm test` → **30/30** (4 files); `npm run lint` → 0; `npm run build` → 0 (13/13 pages; API routes ƒ Dynamic). HTTP replay against the dev server (24 checks; DB wiped before/after): both exact QA repros PASS — POST 0.01% at Σ=100 → **400** with `Total allocation cannot exceed 100% (would be 100.01%)`; PATCH 25 → 25.01 → **400**; kind change with an expense → **409** and `/api/overview` `spentCents` unchanged at **20000**; savings-side kind change → 409; Σ=99.99 + 0.01 → 201.
- **Note:** the first replay run flagged the PATCH repro as "FAIL" — that was a bug in **my test script** (patching Needs 25 → 20.01 yields Σ 95.01, which is legitimately allowed), not in the app; corrected to 25 → 25.01 (Σ 100.01) and re-ran → 24/24.
- **Acceptance criteria (§8 T17/T18):** ✅ all lines met (see Result rows in §8).

### T19 — Currency switched to PHP ✅
- **Commit:** `2940322 T19: switch display currency to PHP`
- **Files:** `lib/constants.ts` (`APP_CURRENCY = "PHP"`; `APP_LOCALE` stays `en-US` — Intl renders `₱1,234.56` identically to `en-PH`), `lib/money.test.ts` (expects `₱1,234.56` / `₱0.01` / `₱0.00` / `₱1,000,000.00` / `-₱8.00`), `lib/allocation.test.ts` (comment), `README.md` (money rules).
- **Design:** no API/schema/component changes needed — every screen formats via `formatCents` (T04), so this is the promised one-constant switch. Amounts remain integer cents (centavos, D4).
- **Verification evidence:** unit suite green (30/30); Node/Intl spot check `Intl.NumberFormat("en-US",{style:"currency",currency:"PHP"})` → `₱1,234.56` / `-₱8.00`; grep for `$/USD` display strings in `app/`, `components/`, `lib/` → none left; `"PHP"` found in the production client chunks inside the Docker image.
- **Acceptance criteria (§8 T19):** ✅ ₱ displayed everywhere; tests/lint/build green.

### T20 — Docker support ✅
- **Commit:** `d0c4b3a T20: docker support (standalone image, migrations on start)`
- **Files:**
  - `Dockerfile` — 3 stages on `node:24-bookworm-slim`: **deps** (`npm ci` + isolated Prisma CLI install pinned to the lockfile's exact version) → **builder** (`openssl` + `prisma generate` + `npm run build`; `DATABASE_URL=file:/app/data/dev.db`) → **runner** (standalone server, `.next/static`, `public`, traced `.prisma` client, `prisma/` schema + migrations, Prisma CLI; non-root `node` user; `EXPOSE 3000`; `VOLUME /app/data`).
  - `docker-entrypoint.sh` — applies pending migrations, then `exec node /app/server.js`.
  - `.dockerignore` — keeps `node_modules`, `.next`, `*.db`, `.env*`, `.git` and internal docs out of the build context (entrypoint kept!).
  - `next.config.ts` — added `output: "standalone"`.
  - `README.md` — "Run with Docker" section (build/run, volume, first-run-empty note).
- **Verification evidence (real Docker daemon 26.1.5 in WSL):** `docker build` OK (~510 MB image). `docker run` with a named volume: log `Applying database migrations…` → migration `20261016160931_init` applied → `Starting Savings Tracker` → `Ready in 0ms`; `whoami` = `node`; fresh volume → `GET /api/categories` = `[]` HTTP 200 and `/` (dashboard) 200; 4 category POSTs → 201; **T17 repro in-image → 400** with the exact message; `"PHP"` present in built client chunks; `docker restart` with the same volume → the 4 categories still served (persistence). Test container + volume + image removed afterwards; host DB wiped to 0/0/0/0.
- **Judgment call:** first runtime attempt failed with `Cannot find module 'effect'` (Prisma CLI transitive dep outside `@prisma/*`) → replaced piecemeal copying with the isolated, version-pinned CLI install stage; re-built and re-verified (see decision log).
- **Acceptance criteria (§8 T20):** ✅ build OK; container migrates + serves; fresh volume empty (D3); data persists across restart; T17 + PHP active in the image.

### T21 — Auth data model + migration ✅
- **Commit:** `3070c50 T21: auth data model + migration (User + per-account ownership)`
- **Files:** `prisma/schema.prisma`, `prisma/migrations/20261017044443_phase2_accounts/migration.sql`.
- **Schema:** new `User` model per §5 (`id`, `username @unique`, `passwordHash`, `role @default("USER")`, `status @default("PENDING")`, `createdAt`, `decidedAt?`, reverse relations); each data model gains `userId Int?` + `user User? @relation(… onDelete: Cascade)` + `@@index([userId])`; `Category.name` global `@unique` → `@@unique([userId, name])` (D16). **Transitional detail (resolved in T26):** `userId` was nullable during the T21→T26 rollout — required would have broken `tsc` at the 5 pre-auth create sites (18-error probe) with no user to reference before T23; the first Admin claimed NULL-owner rows (T23/D21) and **T26 tightened it to required** (migration `20261017051621_phase2_scoping`; the claim code was removed). A comment block in the schema documents this; full rationale in §12.
- **Migration:** `npx prisma migrate dev --name phase2_accounts` → `20261017044443_phase2_accounts`; SQL: `CREATE TABLE "User"` + SQLite table-redefine of the four data models (row copy preserves a NULL owner → safe on non-empty DBs), new FKs (`ON DELETE CASCADE`), per-model `userId` indexes, composite `Category_userId_name_key`, `User_username_key`.
- **Verification evidence:**
  - `npx prisma migrate status` → 2 migrations · "Database schema is up to date!".
  - DB probes: tables `Category · Expense · Income · SavingsEntry · User` (+ `_prisma_migrations`); counts `users 0 · 0/0/0/0` (fresh start = no users, D3/D15); `Category` indexes `Category_userId_idx` + `Category_userId_name_key`; `Income` FK → `User(id)` `ON DELETE CASCADE`; `User` columns `id, username, passwordHash, role, status, createdAt, decidedAt`.
  - **Kept probe (why nullable):** with `userId Int` → `npx tsc --noEmit` = **18 errors / 5 files** (all at pre-auth create sites); with `Int?` → clean.
  - Gates: `npm test` **30/30** (4 files) · `npm run lint` clean · `npm run build` green (13/13 pages; API routes ƒ Dynamic).
  - Dev-server smoke on the migrated empty DB: `/` 200 · `/api/categories` `[]` · POST 2 categories / income 100.00 / expense 5.00 / deposit 3.00 → `/api/overview?month=2026-10` reconciles `income 10000 · unallocated 8000 · spent 500 · netSaved 300 · balance 300` · all deletes 204 · **14/14 checks**, server log clean; DB restored to `0 users / 0/0/0/0`.
- **Non-goal note:** no route/UI/README changes — the app behaves exactly as before until T26 scopes routes (new rows are written with a NULL owner).
- **Acceptance criteria (§8 T21):** ✅ migration applies cleanly on the current DB · ✅ build/lint green (+ tests 30/30) · ✅ fresh start has no user rows.

### T22 — Auth core library ✅
- **Commit:** `3ac82e2 T22: auth core library (scrypt hashes + signed session tokens)`
- **Files:** `lib/auth.ts`, `lib/auth.test.ts`, `.env.example`, `README.md`.
- **API:** `hashPassword` / `verifyPassword` (scrypt, random 16-byte salt, `scrypt$<salt>$<hash>` b64url, timing-safe compare; malformed stored hash → `false`, no throw); `createSessionToken(userId, nowMs?)` / `verifySessionToken(token, nowMs?)` (`<payload b64url>.<hmac b64url>`, payload `{ uid, exp }`, HMAC-SHA256, TTL 30 d — expired/tampered/wrong-secret/malformed → `null`); `setSessionCookie` / `clearSessionCookie` (async `cookies()` per the bundled Next 16 docs; httpOnly, `SameSite=Lax`, path `/`, `Secure` in production, `maxAge` 30 d); `getSessionSecret()` (env as-is; **production missing → throws**; dev/test → fixed fallback + one-time `console.warn`); `SESSION_COOKIE_NAME` / `SESSION_TTL_SECONDS` exported.
- **Tests (`lib/auth.test.ts`, 13/13):** hash ≠ password + `scrypt$…` shape; verify true/false (incl. empty/case-shifted); same password twice → different hashes, both valid; malformed stored hashes → false; token round-trip; tampered signature; tampered payload under a valid signature; expiry boundary (valid at `exp−1 s`, invalid at `exp`); 31-day-old token; wrong `SESSION_SECRET`; malformed tokens (`abc`, `abc.`, `.def`, `a.b.c`, null/undefined); dev-fallback round-trip; production fail-fast (`NODE_ENV` flipped via a typed helper — the `tsc` pass in `next build` caught the direct read-only write).
- **Config/docs:** `.env.example` gains `SESSION_SECRET` (+ `openssl rand -base64 32` hint); README config-table row + Docker example `-e SESSION_SECRET="$(openssl rand -base64 32)"` with a note that changing the value signs everyone out.
- **Evidence:** `npm test` **43/43** (5 files) · `npm run lint` clean · `npm run build` green (13/13; type-check included the new files).
- **Non-goal note:** no routes/UI/DB changes — registration/login land in T23/T24.
- **Acceptance criteria (§8 T22):** ✅ `npm test` green incl. the new file · ✅ lint/build green.

### T23 — Auth API + admin bootstrap ✅
- **Commit:** `a04362f T23: auth API (register/login/logout/me) + admin bootstrap`
- **Files:** `app/api/auth/{register,login,logout,me}/route.ts`, `lib/validation.ts`, `lib/types.ts`, `lib/auth.ts`.
- **Routes:** `POST /api/auth/register` — zod (`usernameSchema` 3–30 + `A-Za-z0-9._-`, `passwordSchema` ≥ 8 ≤ 200); JS case-insensitive duplicate check (D16 pattern) → 409 `Username "X" is already taken`; **first-ever account** → `ADMIN`/`APPROVED` and claims all NULL-owner rows in one `$transaction` (D15/D21 — verified: a category created before the first account ends up owned by the admin); later accounts → `USER`/`PENDING`; 201 `{ user, message }`, never auto-logs-in. `POST /api/auth/login` — 401 `Invalid username or password` for unknown OR wrong (identical); status gate **after** password verify: PENDING → 403 `Account pending admin approval`, REJECTED → 403 `This account registration was declined`; success → `setSessionCookie` + 200 `{ user }`. `POST /api/auth/logout` → clears cookie, 204. `GET /api/auth/me` → session user re-read from the DB or 401 `Authentication required`.
- **Guards (T25–T27 consumers):** `getSessionUser()` (cookie → verify → DB; unknown/expired/tampered → null) and `requireUser()` / `requireAdmin()` returning `{ user } | { response }` — signed out → 401, session not APPROVED anymore → 403 (pending/declined), non-admin under `requireAdmin` → 403 `Admin access required`.
- **DTO:** `UserDTO` + `toUserDTO` (`lib/types.ts`) — id/username/role/status/createdAt/decidedAt only; `passwordHash` never leaves the DB.
- **Evidence:** **48/48** curl checks against the dev server — bootstrap claim + scrypt hash in DB, response DTO shape, 409/400 validation matrix (case variants, short password, bad chars, non-JSON), identical 401s, PENDING/REJECTED 403s, cookie flags (HttpOnly, SameSite=Lax, Path=/; no Secure in dev), `me` 200/tampered 401/after-logout 401/deleted-user 401, approve-in-DB → login 200. Gates: `npm test` **43/43** · lint clean · build green. DB left fresh-empty (0 users / 0 categories).
- **Acceptance criteria (§8 T23):** ✅ every listed curl path verified.

### T24 — Auth UI (`/login` + `/register`) ✅
- **Commit:** `2645307 T24: auth UI (login + register, (app)/(auth) route groups)`
- **Structure:** new **route groups** — all five app pages moved to `app/(app)/` (URLs unchanged; layout renders `Nav` + `<main>`), auth pages at `app/(auth)/{login,register}` (layout = centered, no nav). Root layout now only `<html>/<body>`. Deviation from the literal plan paths (`app/login/page.tsx`) recorded here: group layout is what delivers "no app nav" + T25's session-aware shell.
- **Components:** `AuthCard.tsx` (shared centered card + brand link); `LoginForm.tsx` (username/password, inline error incl. exact 403 PENDING/REJECTED text, loading/disabled submit, link to register; success → `router.replace("/")`); `RegisterForm.tsx` (adds confirm + "Passwords do not match" client check; success panel: green "Admin account created — sign in to continue." vs amber "Account must be approved…" + "Go to sign in" button).
- **Session redirects:** both pages are server components: `getSessionUser()` → APPROVED session → `redirect("/")`. Per the bundled Cache-Components docs the pages declare `export const instant = false` **and** `await connection()` before the session read — without `connection()` the dev server logged `Date.now()` (inside `verifySessionToken`) as a blocking-prerender insight; after it, dev logs are clean.
- **Evidence:** **27/27** curl checks — forms present (`name="username"/"password"/"confirm"`), hints/links, **no app nav** on auth pages, all five app pages 200 with nav after the move, signed-in `/login` + `/register` → **307 → `/`**, logout → render again; DB left fresh-empty. Gates: `npm test` **43/43** · lint clean · build green (`/login`, `/register` ƒ Dynamic).
- **Non-goal:** no route guards yet (T25) — app pages are still reachable while signed out until then; form flows verified in-browser by QA (T32).
- **Acceptance criteria (§8 T24):** ✅ render 200 · ✅ pending/admin success states implemented (SSR-verified; browser pass T32) · ✅ inline errors · ✅ signed-in redirect.

### T25 — Route protection + session-aware shell ✅
- **Commit:** `dfd4981 T25: route protection (proxy.ts) + session-aware shell`
- **Files:** `proxy.ts` (new, root), `app/(app)/layout.tsx`, `app/(app)/admin/users/page.tsx` (stub), `components/Nav.tsx`.
- **Mechanism (also in §12):** Next 16 renamed middleware → **`proxy`**; `proxy.ts` = optimistic cookie-only redirects for the six app route patterns (no DB); the `(app)` layout = secure DB session check (missing/non-APPROVED → `/login`); `/admin/users` = role re-check; auth pages = APPROVED-session redirect; APIs get `requireUser()` in T26.
- **Nav:** receives `{ username, role }` from the layout — shows the username, a **Log out** button (`POST /api/auth/logout` → `router.replace("/login")`, disabled while in flight), and an **Admin** link (`/admin/users`) only when `role === "ADMIN"`.
- **Admin stub:** `app/(app)/admin/users/page.tsx` — title + note; the approvals API + UI land in T27.
- **Evidence:** **31/31** curl checks — signed-out 307 → `/login` for `/`, `/income`, `/expenses`, `/savings`, `/categories`, `/admin/users` (also with a tampered cookie), `/login`+`/register` exempt, admin session: username + Log out + Admin link + `/admin/users` 200, bob (USER): no Admin link, `/admin/users` → 307 → `/`, logout → `/income` 307 again while the admin session stays valid; DB fresh-empty. Gates: `npm test` **43/43** · lint clean · build green (`ƒ Proxy (Middleware)`; app pages now ƒ Dynamic).
- **Acceptance criteria (§8 T25):** ✅ logged-out redirects on every app route · ✅ username+logout in the shell (browser click-flow in T32) · ✅ logout re-locks · ✅ non-admin blocked from `/admin/users` · ✅ gates green.

### T33 — Round-3 QA defect fixes (BUG-QA-03/04/05) ✅
- **Commit:** `7827dd4 T33: fix T32 QA defects (BUG-QA-03/04, document BUG-QA-05)`
- **BUG-QA-04 (High — prod sign-in stays on `/login`):** `components/LoginForm.tsx` — success now calls `window.location.replace("/")`, a hard document load that always follows the fresh session cookie (immune to the production router cache that held the signed-out `/` redirect payload) and drops `/login` from the back history. `components/AuthCard.tsx` — the brand link is `prefetch={false}`, so the signed-out `/` payload is never seeded in the first place. Chose `replace` over `assign` (avoids the `@next/next/no-location-assign-relative-destination` lint rule while keeping the same full reload).
- **BUG-QA-03 (pre-hydration credential leak):** new `lib/use-hydrated.ts` (`useSyncExternalStore`, server snapshot `false` — the `lib/use-today.ts` pattern, no hydration mismatch, no effect-setState). Both `LoginForm` and `RegisterForm` keep the submit **disabled until hydration** and declare `method="post"`; the SSR markup asserts `method="post"` + `disabled=""`. A pre-hydration Enter submit now POSTs to the page route — this fork re-renders it (`200`, no redirect, no credential echo, URL unchanged) instead of native-GETting credentials into the URL.
- **BUG-QA-05 (soft prod redirects):** triaged **accepted + documented** (no behavior change) — README (Run with Docker) + `app/(app)/layout.tsx` comment; verified as inherent to the fork's production postponed/prerender streaming (`no-store`, no protected content, browser still lands on the target, dev keeps hard 307s, proxy guard already hard-redirects).
- **Verification evidence:** gates **87/87 tests** (9 files) · lint clean · build/tsc green. **Dev acceptance 16/16**: SSR form facts on `/login` + `/register`, native POST clean on both, register/login/dashboard regression 201/200/200, signed-in `/login` hard 307, signed-out `/` proxy 307, DB fresh-empty. **Production standalone (built from this revision, :3001):** same SSR form facts + native POST; signed-in `/login` confirmed the documented soft form (`200`, `x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`, `no-store`, body `NEXT_REDIRECT`, no login form); signed-out `/` → hard 307. **Edge-headless browser replay on the production build (QA's `playwright-core` temp setup — no repo deps): 6/6** — G2 replay (zero `/?_rsc=` prefetches from signed-out `/login`; sign-in lands on `/` + Dashboard heading without a manual reload) and A13 replay (submit disabled pre-hydration, forced click cannot navigate, URL stays `/login`, sign-in works once hydrated). QA replay queued to close all three formally.
- **Acceptance criteria (§8 T33 / QA specs):** ✅ BUG-QA-04 fixed + replayed on production · ✅ BUG-QA-03 fixed (inert + safe POST) · ✅ BUG-QA-05 triaged and documented · ✅ gates green · ✅ DB fresh-empty.

---

## Senior QA

> Independent verification in four rounds against §8 acceptance criteria and PM decisions. **Round 1** (T15 `2f4add3`): T16 ✅ DONE — two defects → T17/T18. **Round 2** (`5ecab99` + `2940322` + `d0c4b3a`): both fixes re-verified and closed; T19/T20 verified — **Phase 1 fully green**. **Round 3 (2026-10-17)** on `105d39c` (T21–T31): **T32 ✅ DONE** — every Phase 2 acceptance criterion verified on dev *and* the production image; three defects logged → T33. **Round 4 (2026-10-17)** on the T33 revision `7827dd4`: **all three defects closed** — BUG-QA-03/04 repros now pass as *hard assertions* (browser 81/81 on dev **and** the image, 0 KNOWN-BUG), BUG-QA-05 accepted-as-documented with **QA concurrence** (soft form re-probed on the fresh image: `no-store`, no protected content; dev + the proxy guard keep hard 307s). Gates 87/87 · lint · build green. **Role boundary:** QA tests and reports only — no source changes, no dependencies added (`package.json` untouched — D11). Last updated: 2026-10-17.

### QA task list

| # | QA task | Status |
|---|---------|--------|
| Q1 | Verify T01–T15 acceptance criteria (§8) on the built app | ✅ DONE |
| Q2 | Edge cases for every backlog + §8 T16 flows F1–F8 / E1–E8 | ✅ DONE |
| Q3 | Gates: `npm test`, `npm run lint`, `npm run build` | ✅ DONE |
| Q4 | Seed verification: fresh → seed → idempotent re-run → production guard | ✅ DONE |
| Q5 | Real-browser pass (all "Deferred to QA" items in T06/T08/T10/T12/T14 + T16 UI checks) | ✅ DONE |
| Q6 | Defect log with repro, evidence, suggested fixes → T17/T18 | ✅ DONE |
| Q7 | Re-verify BUG-QA-01/BUG-QA-02 repros after T17/T18 (expect 400 / 409) | ✅ DONE — round 2: exact repros now 400 / 409 (see Defect log status lines) |
| Q8 | Regression after T17/T18: gates + API suite + browser suite, DB wiped after | ✅ DONE — 30/30 · 197/197 · 54/54 (dev) · DB 0/0/0/0 |
| Q9 | Verify T19 (PHP): UI texts, formatting lib, no USD leftovers, image chunks | ✅ DONE — ₱ in every suite; source scan clean; `PHP` in image chunks |
| Q10 | Re-verify T20 Docker image: rebuild, boot, in-container guards, browser, persistence | ✅ DONE — 15/15 in-container · 54/54 browser on image · restart persistence |
| Q11 | Phase 2 (§8 T21–T31): verify acceptance criteria on the built app | ✅ DONE — per-task matrix below (dev + production image) |
| Q12 | Phase 2 edge cases: pre-hydration submits, isolation probes, negative wallet, filters, themes, session edge cases | ✅ DONE — edge-case table below |
| Q13 | Gates: `npm test`, `npm run lint`, `npm run build` | ✅ DONE — 87/87 (9 files) · lint clean · build green (21/21) |
| Q14 | Seed verification (demo admin, dataset, idempotent re-run, production guard) | ✅ DONE — counts 1/4/2/4/1 · re-run identical · guard exit 1 · API wallet ₱4,710.00 |
| Q15 | Real-browser suites — dev server and the production Docker image | ✅ DONE — dev 76/76 (+1 known) · image 75/75 (+2 known) |
| Q16 | Docker: `SESSION_SECRET` hard requirement, restart persistence, Secure cookie flags | ✅ DONE — no-secret login 500 + D17 fail-fast log · restart 200 · `Secure; HttpOnly; Lax` |
| Q17 | Defect log with repro + suggested fixes → queued as T33+ | ✅ DONE — BUG-QA-03/04/05 below (BUG-QA-05 discovered by QA on the image) |
| Q18 | Final state: DB wiped, dev server stopped, Docker artifacts removed | ✅ DONE — 0/0/0/0 · server stopped · container/bind-dir/image removed |
| Q19 | Re-verify the T33 fixes for BUG-QA-03/04 (xfails `A13*`/`G2` promoted to **hard assertions**) | ✅ DONE — dev **81/81** · image **81/81**, 0 KNOWN-BUG |
| Q20 | Concur on BUG-QA-05 **accepted-as-documented** (README + layout comment) incl. the `QA_PROD=1` tolerance | ✅ DONE — soft form re-probed on the T33 image (`no-store`, 0 password inputs, signed-out `/` hard 307) |
| Q21 | Round-4 gates + final state (DB wiped, server stopped, Docker artifacts removed) | ✅ DONE — 87/87 · lint · build green; dev DB 0/0/0/0; container/bind-dir/image removed |

### Method & environment

- **Revisions verified:** round 1 = `2f4add3` (T15); round 2 = `5ecab99` (T17/T18) + `2940322` (T19) + `d0c4b3a` (T20), docs `5145308`; round 3 = `105d39c` (T21–T31, Phase 2); round 4 = `7827dd4` (T33 fixes) + docs `92333ba`. QA made **no source changes** and added **no dependencies** (`package.json` untouched — D11).
- **Environment:** WSL Debian · Node v24.22.0 · Prisma 6.19.3 · SQLite. Rounds 1–2: dev server only. **Round 3:** additionally the production artifact — image `savings-tracker:qa32` built from `105d39c`, `docker run -e SESSION_SECRET=… -p 3001:3000` with a bind-mounted DB at `/home/zane/qa-t32-data` (moved out of `/root` so the WSL-side DB tooling can reach it; container `node` uid = host `zane`), Docker 26.1.5 operated as root.
- **Tooling (outside the repo, under `C:\Users\sonso\AppData\Local\Temp\opencode\`):** rounds 1–2: `qa\` + `qa-web\` (`playwright-core` + the installed **system Edge headless**). Round 3: `qa-p2\qa-p2-api.mjs` (199 checks; env overrides `QA_BASE`/`QA_SECRET`/`QA_DB_URL`/`QA_EXPECT_SECURE`/`QA_PROD`/`QA_REPORT`; DB ops via `qa-p2\db-tool.ts`) + `qa-p2\{docker-up,nosecret-test,seed-check,seed-api-check,persist-check,gates}.sh`; browser suite `qa-web\qa-p2-browser.mjs` (77 checks; `QA_BASE`/`QA_WIPE`/`QA_TAG`) + `probe-*` repro scripts for BUG-QA-04/05 — all evidence produced with zero repo dependencies. **Round 4:** the same suites with the xfails promoted to hard assertions (`A13`/`A13b`/`A13c`/`A13d`, `G2`/`G2b`), plus `qa-p2\{reclaim-3001,probe-which-db,probe-soft-redirect-t33,wait-url,api-docker-tee,teardown-t33}.sh` and the captured console log `qa-p2\qa-p2-api-docker-t33.log` (see the round-4 infra note).
- **Data state:** every suite starts from/restores the empty DB (D3); round-3/4 final state: dev DB 0/0/0/0, dev server stopped, Docker container/bind-dir/image removed, ports 3000/3001 free.

### Results summary — Phase 1 (rounds 1–2)

| Gate | Result |
|------|--------|
| `npm test` | ✅ 30/30 (4 files) — incl. 8 new route-level regression tests |
| `npm run lint` / `npm run build` | ✅ clean / ✅ green (13/13 pages) |
| API suite (S0 + F1–F8 + E1–E8 + V/N/M/D + X1–X3/X6/X7; X1/X2 now hard assertions) | ✅ **197/197 PASS** · 1 observation |
| Lib checks (allocation, money ₱, dates, invariants) | ✅ all PASS |
| Seed verification | ✅ 12/12 · idempotent re-run |
| Real-browser suite — dev server | ✅ 54/54 PASS · console clean except expected 400/409 |
| Over-budget visual spot check | ✅ 3/3 (red bar `bg-red-500`, red label `text-red-600`, width clamped at 100%) |
| Docker in-container checks (T20, fresh volume) | ✅ 15/15 PASS — boot, empty DB, T17/T18 guards, overview invariant |
| Real-browser suite — production image (:3001) | ✅ 54/54 PASS |
| Docker restart persistence | ✅ marker category survived `docker restart`; cleanup verified empty |

### Results summary — Phase 2 (round 3, T32 on `105d39c`)

| Gate | Result |
|------|--------|
| `npm test` | ✅ **87/87 (9 files)** — wallet/money/dates/allocation/validation/auth + admin-users/categories/tenancy API suites |
| `npm run lint` / `npm run build` | ✅ clean / ✅ green (21/21; all app routes ƒ Dynamic, `ƒ Proxy (Middleware)` listed) |
| API suite — dev (:3000) | ✅ **199/199 PASS** (0 fail) |
| API suite — production image (:3001) | ✅ **192 PASS + 7 KNOWN-BUG** (BUG-QA-05; 199 checks, 0 fail) |
| Real-browser suite — dev (:3000) | ✅ **76 PASS / 0 FAIL / 1 KNOWN-BUG** (BUG-QA-03) |
| Real-browser suite — production image (:3001) | ✅ **75 PASS / 0 FAIL / 2 KNOWN-BUG** (BUG-QA-03 · BUG-QA-04 **4/4**) |
| Seed — fresh / idempotent / production guard | ✅ demo admin `demo`/`demo12345` · counts 1/4/2/4/1 · re-run identical · `NODE_ENV=production` → exit 1 (tables untouched); API overview wallet **₱4,710.00** (6,200 − 490 − 1,000) |
| Docker — `SESSION_SECRET` hard requirement | ✅ no-secret container: `/login` 200, register 201, login of an existing user **500** + fail-fast log (D17); with secret → full flows green |
| Docker — restart persistence + cookie flags | ✅ alice login 200 after `docker restart` (data survived); `Set-Cookie` = `Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=lax` on the image |

### Results summary — T33 re-verification (round 4, `7827dd4`)

| Gate | Result |
|------|--------|
| `npm test` / lint / build | ✅ **87/87 (9 files)** · clean · green (21/21) |
| API suite — dev (:3000) | ✅ **199/199 PASS** |
| API suite — production image (:3001, rebuilt) | ✅ **192 PASS + 7 KNOWN-BUG** (= documented BUG-QA-05; 0 fail) |
| Real-browser suite — dev (:3000) | ✅ **81/81 PASS — 0 KNOWN-BUG** (`A13`/`A13b`/`A13c`/`A13d` + `G2`/`G2b` are hard assertions now) |
| Real-browser suite — production image (:3001) | ✅ **81/81 PASS — 0 KNOWN-BUG** (was 75 + 2; `G2` 5/5 logins land with no reload) |
| BUG-QA-05 accepted-as-documented check | ✅ README bullet + `(app)` layout comment present; signed-in `/login` soft `200` + `x-nextjs-prerender`/`x-nextjs-postponed`, `private, no-cache, no-store`, body `NEXT_REDIRECT` with **0 password inputs**; signed-out `/` hard `307` |
| Final state | ✅ dev DB 0/0/0/0 · dev server stopped · container/bind-dir/image removed · ports 3000/3001 free |

**Round-4 infra note:** the *first* image-API attempt was **voided, not evidence** — a stale `next-server` left on `:3001` by the T33 verification session (started 15:08) answered those requests against the **dev** DB while the suite's DB ops wrote the bind mount (symptom: `AD18 len=6`, dev-DB ids in the I-section). The port was reclaimed (`reclaim-3001.sh`), the container recreated, targeting proven with `probe-which-db.sh` (register → id 1 → present only in the bind DB; dev DB untouched), and the whole image round re-run — every number above comes from the clean re-run on a fresh container DB.

### Results summary — Phase 3 (T40 on the Phase 3 revision, production build)

| Gate | Result |
|------|--------|
| `npm test` / `npm run lint` / `npx tsc --noEmit` / `npm run build` | ✅ **93/93 (9 files)** · lint clean (0 errors, 0 warnings) · tsc clean · build green |
| Production-browser QA (`next build && next start`, :3100) | ✅ **97/97 PASS, 0 FAIL, 0 console errors/exceptions** — auth, dashboard, income/expenses/savings/categories CRUD, filters, admin approve/reject, non-admin shell, dialogs/toasts/confirms, both themes, 320/390/768/1024/1440, PWA metadata/SW/cache |
| API regression suite (production build, :3100) | ✅ **192 PASS / 0 FAIL / 7 KNOWN-BUG** — all seven are the accepted/documented BUG-QA-05 soft-redirect form (`QA_PROD=1 QA_EXPECT_SECURE=1`) |
| Lighthouse mobile | ✅ `/login` **99 performance · 100 accessibility · 100 best-practices · 100 SEO** · authenticated `/` **96 · 100 · 100 · 100** |
| PWA — manifest/icons/head | ✅ manifest 200 valid JSON · 192/512/maskable/Apple icons 200 at declared sizes · manifest link + theme-color + Apple metadata in SSR head |
| PWA — service worker + privacy | ✅ SW active on the production build · `savings-tracker-v1` contains **27 entries, 0** `/api`, RSC or non-offline HTML · `/offline` precached · `sw.js` = `no-cache, no-store, must-revalidate` + `Service-Worker-Allowed: /` |
| Offline | ✅ with the **real server stopped**: signed-in navigation/reload lands on `/offline` (nav-free, themed), Try again reloads, reconnect → dashboard; dev server unaffected |
| Update flow | ✅ v1 → v2 deploy: “Update available — Refresh” toast → Refresh activates v2 → one reload → only `savings-tracker-v2` remains; no console errors |
| Docker (fresh volume) | ✅ `savings-tracker:t40` boot applied all three migrations · `/login` 200 · `/` 307 · API 401 · manifest/SW/offline/icons 200 · first-user admin + category create · `docker restart` → login 200 and data intact |
| Layout/a11y fixes | ✅ no horizontal overflow at 320px on `/`, `/income`, `/expenses`, `/savings`, `/categories`, `/admin/users` · modal autofocus lands on amount · cards/donut/trend accessible tables · labelled progress bars · toast region announced |
| Dev-state hygiene | ✅ `prisma/dev.db` restored from `/tmp/dev-pre-t40.db`; test server, Chrome and Docker container/volume removed after verification |

**Known limitations carried forward:** BUG-QA-05 (production page redirects can be soft `200 + NEXT_REDIRECT`; accepted/documented, no protected content) and the stateless-session observation (a copied cookie remains valid until its 30-day expiry; by design D17). PWA offline is **fallback-only** by design — no financial data is available offline.

**T40 fix list:** `currencySymbol()` for peso form prefixes; auth copy says “peso” not “dollar”; `FormDialog` prioritizes `[data-autofocus]` over the close button; sr-only chart tables wrapped in `div.sr-only` and `MonthPicker` label width reduced to `min-w-28` (320px overflow); `OfflineRetry` uses a full navigation to `/` (SW fallback); `ProgressBar` accepts a descriptive label (dashboard/categories pass one); `Toaster` container has `role="region"`.

### T01–T20 acceptance matrix (rounds 1–2)

| Task | Verdict | Notes (independent evidence) |
|------|---------|------------------------------|
| T01 | ✅ | build/lint green; `/` + all 4 pages 200 with nav and "Savings Tracker" title |
| T02 | ✅ | `npx prisma -v` → 6.19.3; migrate status up to date; test/build scripts run |
| T03 | ✅ | 4 tables exercised end-to-end by the suites; final counts 0/0/0/0 |
| T04 | ✅ | 30/30 unit tests incl. every §8 T04 case; independent invariant re-check |
| T05 | ✅ | all §8 T05 paths pass; Σ=100.01 now rejected (fix T17 — re-verified) — BUG-QA-01 closed |
| T06 | ✅ | create/edit/delete, Σ>100 blocked with visible error, confirm dialog, onboarding empty state |
| T07 | ✅ | month filters + year boundary, UTC-midnight storage, 400/404/204 lifecycle |
| T08 | ✅ | split chips 1750/1250/1000/1000 exact, no Unallocated chip, delete, month grouping |
| T09 | ✅ | kind mismatch 400 (exact message), unknown category 404, month+categoryId combine |
| T10 | ✅ | add/list/delete, filters combine, totals update, empty states, submit disabled without categories |
| T11 | ✅ | balance math exact, negative balance allowed (D7), all-time vs month distinction |
| T12 | ✅ | deposit 1000 → withdraw 200 → ₱800 in UI, signed green/red rows, red negative card, delete |
| T13 | ✅ | reconciles with the three page APIs; zero-category payload 200; live recompute (D6) |
| T14 | ✅ | cards reconcile; prev-month zeros + empty state; over-budget red + clamped bar; 4→1 col |
| T15 | ✅ | fresh install onboarding; seed demo exact + idempotent + prod guard; icon/title present |
| T16 | ✅ | round-1 pass — checklist logged, gates green, Work Log entry added; both defects queued as T17/T18 (since fixed + re-verified) |
| T17 | ✅ | exact repros: POST 0.01% @ Σ100 → 400 `(would be 100.01%)`; PATCH → Σ100.01 → 400; Σ100 boundary still allowed; 99.99 + 0.01 → 201; overview never negative (API `X2.*` 6/6 PASS) |
| T18 | ✅ | kind change with entries → 409; `spentCents` unchanged 21000; row stays attached; savings-side variant 409; safe kind change (no entries) 200 (API `X1.*` 12/12 PASS) |
| T19 | ✅ | ₱1,234.56 everywhere (chips/cards/totals/negative/1¢) in real-browser runs on dev + image; lib checks ₱; no `USD`/`$` display left in `app/`, `components/`, `lib/`; `PHP` in image client chunks |
| T20 | ✅ | `docker build` OK; fresh volume boots empty with migrations applied; non-root `node`; in-container T17/T18 guards 15/15; full browser suite 54/54 on the image; data survives `docker restart`; artifacts cleaned |

### T21–T31 acceptance matrix (round 3 — `105d39c`)

| Task | Verdict | Notes (independent evidence) |
|------|---------|------------------------------|
| T21 | ✅ | migration `20261017044443_phase2_accounts` on a fresh DB: 5 tables / 0 users; per-account names enforced (same name in two accounts 201 `SG6`; duplicate within one → 409 `SG7`); the nullable→claim window is closed since T26 (`userId` required) |
| T22 | ✅ | the 13 `lib/auth.test.ts` tests are part of the green 87/87 run; production cookie flags incl. **Secure** (image `L5b` + raw login-header check); missing `SESSION_SECRET` in production fails fast (D17) |
| T23 | ✅ | first register → ADMIN/APPROVED (`R6`), later → PENDING (`R10–R12`); pending/declined logins 403 with the exact messages (`L3`; browser `A3`/`A4`); 401 matrix for tampered/expired/unknown-uid/wrong-secret/malformed tokens (`P11–P17`); no `passwordHash` in any payload (`R6c`) |
| T24 | ✅ | `/login` + `/register` render with mismatch guard + pending panel + sign-in link (browser `A5`/`A6`/`A6b`); signed-in redirects hard-307 on dev (`P7`/`P8`) — **prod serves them soft → BUG-QA-05** |
| T25 | ✅ | proxy 307s signed-out on all six patterns (`S9–S14`; tampered `P12`); non-admin `/admin/users` → `/` (browser `D2`, API `P9`); logout re-locks (`C18`/`C18b`, `P21c`); Admin link admin-only (`C1c` vs `D1`); layout DB re-check + `instant = false`/`connection()` in place |
| T26 | ✅ | accounts fully disjoint in the browser (`D3`/`D3b` — bob sees neither alice's ₱550 row nor her categories; fresh `F1`); cross-account ids → empty/404 (API `SG*` + 15 tenancy tests); overview isolated (`AD*`/`SG*` reconciliations) |
| T27 | ✅ | UI approve/reject with live counts 2→1→0 pending · 4 approved · 2 declined + reject confirm dialog (`C4–C6b`); API guard order 404 → 400(self) → 400(admin) → 409 (`AD*`); non-admin 403; no hash leaks |
| T28 | ✅ | wallet reconciles for every account shape: alice ₱4,250.00 (`C2d`), bob ₱1,600.00 (`D1b`), dave **−₱500.00 shown red** (`E1`/`E1b`), fresh ₱0.00 (`F1b`), seed ₱4,710.00; month-independence + live drift checks in the API suite |
| T29 | ✅ | chips only for the right kind (`C7`, `C10b`); list + live total follow (`C8`), Clear restores (`C9`), savings month net follows while the balance stays all-time (`C11`/`C11b`), dashboard rows filter with cards unchanged (`C12`–`C12c`), income tab has no filter (`C3b`); malformed CSV → 400 (`V*`) |
| T30 | ✅ | zero legacy palette utilities across all six screens (browser token audit `C15`–`C15f`); shared `.btn-*`/`.alert-*`/`.badge*` vocabulary renders; mobile 390×844 has no horizontal overflow (`C17`) |
| T31 | ✅ | Light/Dark/System control on auth + nav (`A7`/`A7b`); dark applies + persists + no-FOUC head script precedes `<body>` (`A8`–`A12`, `C14`); system preference follows the OS live (`A10b`/`A10c`); dark bg genuinely dark (`C13b`) and light restores (`C14b`) |

### F1–F8 flows (§8 T16)

| Flow | Verdict | Evidence |
|------|---------|----------|
| F1 categories 35/25/20/20 saved | ✅ | B1: 4 rows, Total 100%, Unallocated ₱0.00, indicator green |
| F2 income 5000.00 → 1750/1250/1000/1000 | ✅ | B2: chips ₱1,750.00 / ₱1,250.00 / ₱1,000.00 ×2; no Unallocated chip |
| F3 expense 200 on Bills → remaining 1550 | ✅ | B3+B6: "of ₱1,750.00" + exact remaining (API 175000/20000/155000) |
| F4 deposit 1000 → balance 1000 | ✅ | B4: DEPOSIT default, balance card ₱1,000 (API month-net 100000) |
| F5 withdraw 200 → balance 800 | ✅ | B5: balance ₱800; rows signed +green / −red |
| F6 edit 35→40 blocked, then Needs 20 + retry → 40/20/20/20 | ✅ | B8: blocked error visible at Σ=100%; after retry saved, Total 100%, dashboard recomputed |
| F7 prev month → zeros + empty states | ✅ | B7: Sep 2026 zeros + empty state; all-time balance ₱800 unchanged |
| F8 delete category with expenses → blocked | ✅ | B9: blocked message + confirm dialog; API 409 |

### Edge cases (§8 T16 E1–E8 + QA extras)

| Case | Verdict | Evidence |
|------|---------|----------|
| E1 1¢ @ 50/30/20 → 1/0/0 | ✅ | unit + lib checks; API E1; B12 single chip, no Unallocated |
| E2 Σ<100 shows Unallocated | ✅ | B11: "Total: 80% · Unallocated: 20%" + chip; API 25000¢ |
| E3 duplicate category name blocked | ✅ | API E3/E3b 409 (case-insensitive + upper); UI error surfaced |
| E4 negative/zero amounts blocked | ✅ | API E4 (13 checks); B12 inline errors for invalid/negative/zero |
| E5 1234.56 → 123456¢ round-trip | ✅ | API storage check; B11 displays ₱1,234.56 back |
| E6 expense↔savings mismatches rejected | ✅ | API E6/E6b 400 with exact messages; E6c/E6d unknown category 404 |
| E7 withdrawal below zero → red balance | ✅ | API E7 negative allowed (D7), overview consistent; B10 red styling |
| E8 year-boundary month navigation | ✅ | API E8 (16 checks: Dec-2025/Jan-2026 isolation, no leaks, balance continuity); month picker prev/next mechanics browser-verified (B7) |
| X3 % decimals | ✅ | 0.29 accepted, 3-decimal 33.333 rejected, revert OK |
| X6 expense with no income (allocated 0) | ✅ | remaining negative, progress 0 per spec, no crash |
| X7 zero-category app | ✅ | full income unallocated, valid payload, no 500 |

### Phase 2 flows (round 3 — T32)

| Flow | Verdict | Evidence |
|------|---------|----------|
| P1 register → admin bootstrap → approve/reject → sign-in | ✅ | API `R6`/`R10–R12` + `AD*`; browser `A3–A6b`, `C4–C6b` (pending → approved signs in; rejected sees the declined message) |
| P2 per-account isolation | ✅ | `D3`/`D3b` + 15 tenancy tests + cross-account id probes (404/empty, never a leak) |
| P3 Wallet balance (all-time) | ✅ | `C2d` ₱4,250.00 · `D1b` ₱1,600.00 · `E1` −₱500.00 red · `F1b` ₱0.00 · seed ₱4,710.00; month switch leaves it unchanged |
| P4 Multi-select filters (Expenses / Savings / Dashboard) | ✅ | `C7–C12c` + API CSV matrix (`V*`: OR, empty = all, unknown = none, malformed = 400, cross-account = empty) |
| P5 Night mode + no-FOUC | ✅ | `A7–A12`, `C13–C14b` (incl. system-preference live reaction) |
| P6 Sessions: tamper/expiry/logout + live status change | ✅ | API `P11–P22`; browser `C18`/`C18b`; non-revocation replay observation `P23` (by design D17) |
| P7 Production image end-to-end | ✅ | browser 75/75 on `:3001`; Secure cookie flags; `docker restart` persistence; no-secret fail-fast |

### Phase 2 edge cases (round 3 — extras beyond §8)

| Case | Verdict | Evidence |
|------|---------|----------|
| Pre-hydration submit on `/login` + `/register` (credentials into URL) | ❌ **BUG-QA-03** | browser `A13` (xfail; dev + image): `/login?username=…&password=…` |
| Client-side landing after sign-in (production builds) | ❌ **BUG-QA-04** | browser `G2` on the image: 4/4 logins stuck on `/login` until a reload; deterministic prefetch repro |
| Page-component redirects in production | ⚠️ **BUG-QA-05** (Low) | API `P7/P8/P9/P14b/P18c/P19c/P20b` on the image: `200` + soft `NEXT_REDIRECT` (dev stays hard 307); no leaked content, responses `no-store` |
| Zombie `<main>` after client-side login | ⚠️ obs | dev `C1d`: 2 `<main>` in the DOM, 1 visible (hidden previous route tree); a11y + `innerText` unaffected |
| Route announcer vs `[role=alert]` locators | ⚠️ obs | `#__next-route-announcer__` echoes the page heading after navigation (`C4c`) — alert locators must scope by text |
| Dev-only `instant` validation log noise | ⚠️ obs | the dev server logs `Could not validate "instant" … NEXT_REDIRECT` when the `(app)` layout redirects (log noise only; pages still 307, browser console clean) |
| `Secure` cookie over plain `http://localhost` | ✅ | Edge accepts + replays it (image flows green) |
| Credential replay after logout | ⚠️ obs | stateless HMAC tokens stay valid until expiry — by design D17 (`P23`) |
| Mobile 390×844 | ✅ | no horizontal overflow (`C17`) |
| Console hygiene | ✅ | `G1` clean on dev + image (only expected 4xx noise) |

### Phase 2 edge cases (round 4 — T33 re-verification)

| Case | Verdict | Evidence |
|------|---------|----------|
| Pre-hydration submit on `/login` + `/register` | ✅ **fixed (was BUG-QA-03)** | `A13c`/`A13d`: SSR forms carry `method="post"` + a disabled submit; `A13`: with `/_next/static` throttled the forced click is inert; `A13b`: after click + Enter + native `requestSubmit` every recorded URL stays credential-free (dev + image) |
| Sign-in landing (production build) | ✅ **fixed (was BUG-QA-04)** | `G2`: 5/5 UI logins land on `/` with no reload (dev + image); `G2b`: zero `/` prefetches from signed-out `/login` |
| Page-component redirects (production) | ✅ **accepted & documented** | soft `200` + `NEXT_REDIRECT` with `private, no-cache, no-store` and **0 password inputs** in the body; proxy guard + dev keep hard `307`; README/layout comment in place (QA concurrence on BUG-QA-05) |
| Zombie `<main>` after login | ✅ | **no longer occurs** — the post-login navigation is a hard document load; `C1d` total/visible = 1/1 on dev + image (O3 now obsolete) |
| Console hygiene (round 4) | ✅ | `G1` clean on dev + image |

### Defect log

#### Phase 1 (rounds 1–2 — both fixed and closed)

#### BUG-QA-01 — Σ% guard allows 100.01% (D5 violation) → **T17**
- **Severity:** High (money math breaks: allocations exceed income).
- **Where:** `app/api/categories/route.ts` (POST guard) and `app/api/categories/[id]/route.ts` (PATCH guard).
- **Repro:** with categories at Σ=100%: `POST /api/categories {"name":"QAOverflow","percentage":0.01}` → **201**; `PATCH /api/categories/<Needs> {"percentage":20.01}` at Σ=100 → **200**. With a 5000.00 income: `GET /api/overview` → `unallocatedCents: -50`, Σ allocations 500050¢ vs income 500000¢.
- **Expected:** 400 `Total allocation cannot exceed 100% (would be 100.01%)`; `unallocatedCents ≥ 0` always (D5 + §7 invariant).
- **Root cause:** both guards reject only `sumBp > 10001`; Σ=100.01% (= 10001 bp) slips through.
- **Suggested fix:** `> 10000` in both guards + a regression test (full spec in T17).
- **Status:** ✅ **FIXED in T17** (commit `5ecab99`) and **re-verified by QA 2026-10-17** — both repros now return 400 with the exact message; `Σ=100` stays valid and `99.99 + 0.01 → 201`; overview invariant holds (`unallocated ≥ 0`). Guarded by API assertions `X2.post-100.01-400`, `X2.patch-100.01-400`, `X2.overview-no-overshoot`, `X2.total-still-100`, `X2.needs-still-20`.

#### BUG-QA-02 — kind change silently drops entries from totals (D8 violation) → **T18**
- **Severity:** High (data integrity: rows stay attached but accounting silently changes).
- **Where:** `app/api/categories/[id]/route.ts` (PATCH; no check when `kind` changes).
- **Repro:** EXPENSE category with one 210.00 expense → overview `totals.spentCents` = 21000. `PATCH {"kind":"SAVINGS"}` → **200**. After: `spentCents` = 20000 (expense gone from spent) and the expense row is still attached to a SAVINGS-kind category (breaks D8).
- **Expected:** 409 while entries of the current kind exist, D9-style message.
- **Suggested fix:** count `expenses` / `savingsEntries` on kind change, return 409 if > 0 (full spec in T18).
- **Status:** ✅ **FIXED in T18** (commit `5ecab99`) and **re-verified by QA 2026-10-17** — kind change with entries now 409 (`Cannot change kind … — delete them first`), `spentCents` unchanged (21000), row stays attached, kind stays EXPENSE; savings-side deposit variant also 409; entry-free kind change still 200. Guarded by API assertions `X1.kind-change-409`, `X1.spent-unchanged`, `X1.kind-unchanged`, `X1.savings-kind-change-409`.

#### Phase 2 (T33 fixes — QA re-verified 2026-10-17 in round 4, all closed)

##### BUG-QA-03 — pre-hydration submit leaks credentials into the URL (dev + prod)
- **Severity:** Low–Medium (credentials persisted in browser history / access logs; no auth bypass — the server still rejects them).
- **Where:** `/login` + `/register` forms (`components/LoginForm.tsx` / `components/RegisterForm.tsx`): the submit handler exists only after hydration, so a click before that is a **native GET submit** of the form.
- **Repro:** throttle `/_next/static/**` (+2.5 s), open `/login`, fill the fields and click “Sign in” before hydration → URL becomes `/login?username=alice&password=wrongpass1`; same on `/register` (`confirm` too) — reproduced on dev **and** the production image (browser check `A13`, recorded as KNOWN-BUG; the suite recovers by re-submitting after hydration).
- **Expected:** credentials never appear in the URL; a pre-hydration click is inert or performs a safe POST.
- **Suggested fix (T34):** disable the submit until hydrated (the repo already has the hydration-safe `useSyncExternalStore` pattern in `lib/use-today.ts`) or give the forms a native-safe fallback (`method="post"` → the page route 405s); then promote `A13` from xfail to a hard assertion.
- **Status:** ✅ **FIXED in T33** (commit `7827dd4`) — both auth submits are disabled until hydration (`lib/use-hydrated.ts`) and the forms declare `method="post"`, so a pre-hydration click is inert and an Enter submit re-renders the page with a clean URL. Verified on dev (16/16) and the production build (Edge replay: forced click cannot navigate, URL stays `/login`, form works once hydrated). **QA re-verified in round 4** — hard assertions `A13`/`A13b`/`A13c`/`A13d` pass on dev *and* the image (SSR `method="post"` + disabled submit; forced click inert; click → Enter → native `requestSubmit` keep every URL credential-free). **Closed.**

##### BUG-QA-04 — production: sign-in keeps you on `/login` until a manual reload
- **Severity:** High (the production image's primary flow appears broken; workaround = reload; dev is unaffected).
- **Where:** the login form's client-side `router.replace("/")` + the signed-out `/login` page prefetching `/` (AuthCard brand link in `components/AuthCard.tsx`): the prefetch caches the signed-out `307 → /login` RSC payload, and the post-login navigation reuses that cache entry.
- **Repro:** on the image (`:3001`), sign in with any account → the request completes but the app stays on `/login` (no error; loading ends, form clears); a manual reload lands on the dashboard. Browser suite `G2`: **4/4** UI logins needed the reload. Deterministic mechanism proof: `probe-prefetch.mjs` aborts only the first `/?_rsc=` prefetch → sign-in then lands by itself.
- **Expected:** after sign-in the app lands on `/` without a reload.
- **Suggested fix (T33):** navigate hard after sign-in (`window.location.assign("/")`), or `prefetch={false}` on the brand link, or perform the login through a server action that `redirect()`s; re-verify `G2` (currently xfail) on the image.
- **Status:** ✅ **FIXED in T33** (commit `7827dd4`) — post-sign-in navigation is now a hard `window.location.replace("/")` and the AuthCard brand link is `prefetch={false}` (no stale signed-out payload to reuse). **Production Edge replay PASS**: zero `/?_rsc=` prefetches from `/login`; sign-in lands on `/` + Dashboard with no manual reload. **QA re-verified in round 4** — `G2` hard-passes **5/5** on the image (dev too): every UI login lands on `/` with no reload; `G2b` confirms zero `/` prefetches from signed-out `/login`. **Closed.**

##### BUG-QA-05 — production: page-level redirects are soft (`200` + `NEXT_REDIRECT`) instead of `307`
- **Severity:** Low (no user-facing impact — browsers execute the redirect client-side; no protected content in the soft response, verified with curl + node-fetch incl. browser-like headers; responses are `private, no-cache, no-store`).
- **Where:** every server-component `redirect()` reached through page routes — signed-in `/login`/`/register` → `/` (T24), non-admin `/admin/users` → `/` (T25/T27), unknown/non-APPROVED/deleted session on `/` → `/login` (T25).
- **Repro:** `curl -i` with a valid session: dev → `307 location: /`; image → `200` + `x-nextjs-prerender: 1` / `x-nextjs-postponed: 1`, body contains `NEXT_REDIRECT;replace;/;307;` (client-executed). API suite on the image: `P7/P8/P9/P14b/P18c/P19c/P20b` → recorded as KNOWN-BUG (dev stays hard-307, all PASS).
- **Expected:** dev/prod parity (hard 307) or documented-as-behavior.
- **Suggested fix (T33+ triage):** likely inherent to this fork's production postponed/prerender streaming (the shell flushes before `redirect()` resolves, so the status can no longer be 3xx); if hard redirects are needed, move the guards into `proxy.ts`/route handlers — otherwise document. The API suite tolerates the soft form only under `QA_PROD=1`.
- **Status:** ✅ **TRIAGED in T33 — accepted & documented** (no code change): README → Run with Docker bullet + `app/(app)/layout.tsx` comment. Production form re-confirmed on the T33 build (`200`, `x-nextjs-prerender: 1`, `x-nextjs-postponed: 1`, `private, no-cache, no-store`, body `NEXT_REDIRECT`, no protected content), proxy app-route guard stays a hard `307`. **QA concurs in round 4** — re-probed on the fresh T33 image (`probe-soft-redirect-t33.sh`): soft `200` + `no-store`, body has **0 password inputs** / no login form; signed-out `/` → hard `307`; docs in place. The `QA_PROD=1` suite tolerance is retained. **Closed — accepted as documented.**

### Minor observations (non-blocking, not queued)

- **O1** · `lib/use-today.ts` / `lib/use-current-month.ts` module-level cache never refreshes across midnight / month rollover while the tab stays open → the form's default date/month can be stale until reload. Optional later fix: invalidate the store on `visibilitychange`/timer.
- **O2** · The client local-today default date vs the UTC month filter can disagree near month boundaries (e.g., shortly after local midnight on the 1st while UTC is still the previous month), so a fresh entry can land outside the visible month. Inherent to D13's UTC rule; UX nicety at most.
- **O3** · ~~After a client-side login the previous (auth) route tree stays in the DOM as a hidden `<main>` (dev `C1d`: 2 mains, 1 visible).~~ **Obsolete after T33** — the post-login navigation is a hard document load; round-4 `C1d` reports 1 `<main>` (total 1, visible 1) on dev *and* the image, so no hidden kept-alive tree remains.
- **O4** · `#__next-route-announcer__` (role=alert, 1px) echoes the current page heading after navigation (`C4c`) — `[role=alert]` locators must scope by text (the suites now do).
- **O5** · Dev-only: the server log prints `Error: Route "/": Could not validate "instant" … NEXT_REDIRECT` whenever the `(app)` layout redirects a page request (an "instant validation" probe treats the redirect as a validation failure). User-visible behavior and the browser console are clean; log noise only.
- **O6** · Repo hygiene: the untracked 0-byte `nul` file in the repo root (a Windows `> nul` redirect artifact) was **deleted in T33** (commit `7827dd4`).

### Artifacts & how to re-run (all outside the repo, under `C:\Users\sonso\AppData\Local\Temp\opencode\`)

| Artifact | Path / command |
|----------|----------------|
| API suite + report | `qa\qa-t16-api.mjs` → `qa\qa-t16-api-report.json` (**197 PASS**; X1/X2 are hard assertions for BUG-QA-01/02) |
| Lib checks (₱ expectations) | `qa\qa-t16-lib.ts` (run with `tsx`) |
| Seed checks | `qa\qa-t16-seed.mjs` (run after `npm run db:seed`) |
| Browser suite + reports + screenshots | `qa-web\qa-t16-browser.mjs` → `qa-web\qa-t16-browser-report.json` (dev `:3000`) · copies `qa-t16-browser-report-dev.json` / `-docker.json` (both 54 PASS) · `qa-web\shots\` |
| Over-budget visual check | `qa-web\qa-t16-overbudget.mjs` |
| Docker in-container checks + report | `qa-web\qa-t20-docker-checks.mjs` → `qa-web\qa-t20-docker-report.json` (15 PASS; image running on `:3001`) |
| Docker persistence check | `qa-web\persist-create.mjs` → `docker restart qa-t20` → `qa-web\persist-check.mjs` |
| Re-run (WSL) | start `npm run dev` in the repo, then e.g. `node /mnt/c/Users/sonso/AppData/Local/Temp/opencode/qa/qa-t16-api.mjs` (pass `wipe` to reset the DB first); browser suites need the dev server — or the Docker image via `qa-web\run-browser-docker.mjs` (port 3001) |
| **R3/R4 — API suite + reports** | `qa-p2\qa-p2-api.mjs` → `qa-p2\qa-p2-api-report.json` (dev **199 PASS**) · `qa-p2\qa-p2-api-report-docker.json` (image **192 PASS + 7 KNOWN-BUG** = documented BUG-QA-05) · console log `qa-p2\qa-p2-api-docker-t33.log`; DB ops via `qa-p2\db-tool.ts` (wipe / counts / users / set-status / set-role / create-user / delete-user; honors `DATABASE_URL`) |
| **R3/R4 — browser suite + reports + shots** | `qa-web\qa-p2-browser.mjs` → `qa-web\qa-p2-browser-report-dev.json` (**81 PASS**) · `-docker.json` (**81 PASS**) — 0 KNOWN-BUG since round 4 (the `A13*`/`G2` xfails were promoted to hard assertions; script header documents the change) · screenshots in `qa-web\shots\`; env: `QA_BASE`, `QA_WIPE`, `QA_TAG` |
| **R3 — defect repro probes** | BUG-QA-04: `qa-web\probe-prefetch.mjs` (deterministic) + `probe-docker-nav.mjs`/`probe-docker-login.mjs`; BUG-QA-05: `qa-p2\probe-redirects.sh` + `probe-redirects.mjs` + `probe-redirects3.sh` |
| **R4 — re-verification helpers** | `qa-p2\reclaim-3001.sh` (kill a stale `:3001` listener + recreate the container) · `probe-which-db.sh` (prove HTTP :3001 writes the bind DB) · `probe-soft-redirect-t33.sh` (BUG-QA-05 re-probe: headers + no password inputs) · `wait-url.sh` · `api-docker-tee.sh` · `teardown-t33.sh` · `verify-reports.mjs` |
| **R3 — docker + seed + gates scripts** | `qa-p2\docker-up.sh` (:3001; bind `/home/zane/qa-t32-data`) · `nosecret-test.sh` · `seed-check.sh` + `seed-api-check.sh` · `persist-check.sh` · `gates.sh` |
| **R3/R4 — re-run (dev)** | start the dev server, then `node /mnt/c/…/qa-p2/qa-p2-api.mjs`; browser: `cd …/qa-web && node qa-p2-browser.mjs` (self-wipes the dev DB; tags the report `dev`) |
| **R3/R4 — re-run (image)** | **first check `ss -ltnp \| grep :3001`** (a leftover next-server silently steals the port — see the round-4 infra note) → `wsl -u root -d Debian -- bash …/qa-p2/docker-up.sh` (fresh DB per run — the first registration becomes admin) → browser: `QA_BASE=http://localhost:3001 QA_WIPE=none QA_TAG=docker node qa-p2-browser.mjs` → `bash …/qa-p2/api-docker.sh` |
| **T40 — browser QA + report/shots** | `t40-browser-qa.mjs` → `t40-browser-report.json` (**97 PASS / 0 FAIL**; console errors/exceptions arrays empty) · screenshots in `t40-shots\` · run with `node t40-browser-qa.mjs` while a production `next start -p 3100` server and Chrome CDP :9222 are running |
| **T40 — offline/update probes** | `t40-offline-prep.mjs` (warm the SW) → stop the real :3100 server → `t40-offline-now.mjs` (navigate/reload `/offline`, retry) → restart → `t40-offline-reconnect.mjs`; update path via `pwa-update-test.mjs` (v1→v2 toast/Refresh, cache cleanup) |
| **T40 — API rerun** | `QA_BASE=http://127.0.0.1:3100 QA_SECRET=t40-qa-secret QA_PROD=1 QA_EXPECT_SECURE=1 QA_REPORT=…/qa-p2-api-report-t40.json node qa-p2/qa-p2-api.mjs` → **192 PASS / 7 KNOWN-BUG**; DB ops through `qa-p2/db-tool.ts` (`NODE_PATH` set) |
| **T40 — Lighthouse** | `lighthouse-login-mobile.json` (99/100/100/100) · `lighthouse-dashboard-mobile.json` (96/100/100/100; authenticated via `lighthouse-headers.json` + `make-lighthouse-headers.mjs`) |
| **T40 — Docker smoke** | `docker build -t savings-tracker:t40 .` → run on :3200 with `SESSION_SECRET` + fresh `st-t40-data` volume; probe `/login` 200 · `/` 307 · API 401 · manifest/SW/offline/icons 200; register first admin, create category, `docker restart`, login 200; then remove container/volume |
