# Deployment Plan — Savings Tracker (Free Hosting)

> **Status:** ✅ **DEPLOYED** (2026-10-19) — Railway Free · `https://savings-tracker-production-e934.up.railway.app` · admin `zanesonsona` · verified backups in `~/savings-backups/`.
> **v3 changelog:** collapsed to a **single path: Railway Free** (your call to keep things simple). Oracle/GCP/PC alternatives are kept below as fallbacks only. The exec bit + quoting quirks on Windows-vs-WSL are cosmetic, noted in §8.
> **Who:** *You* = browser steps only (marked **you**, ~6 minutes total); *Infra agent* = everything else (marked **me**).
> **Companion:** `Project_state.md` = single source of truth for app scope/status; this file = deployment runbook.

## 0. The plan in one screen

1. The app needs a **persistent disk** (one SQLite file), **HTTPS** (production cookies are `Secure`), and a **single instance**. That eliminates most free hosts (Render/Vercel: no disk; Fly/Koyeb/Heroku: free tiers gone).
2. **Railway Free** fits: persistent 0.5 GB volume, HTTPS on `*.up.railway.app`, no card needed, $0/month for our usage (capped by a $1/month credit). Deploy auto-builds our Dockerfile from GitHub.
3. **The trade-off you accepted:** the service **sleeps when idle** (~5–10 min) → first visit takes 5–30 s to wake, rarely a 502 (retry once). Our image disables Next.js telemetry, which is a known sleep-blocker.
4. **What only you can do** (blocking, non-delegable): sign in / authorize GitHub (≈2 min), paste 2 variables + click deploy (≈2 min), register the admin account the moment I say it's live (≈2 min, security-critical §7).
5. **What I did:** repo hygiene + commit/push, generated the secret, verified the live app (probes, admin claim, approval flow, restart persistence), and left a tested one-command backup script (`~/savings-backups/backup.sh`).

> Production starts **empty** (the dev seed refuses to run in production). Your local dev DB is untouched and is **not** deployed.

## 1. What we're deploying (facts from the repo)

| Item | Fact |
|---|---|
| App | Next.js 16 (App Router) + TypeScript + Tailwind 4; Prisma 6 → **SQLite**. PHP currency display. |
| Production artifact | **Docker image** (`Dockerfile`, multi-stage, Next `output: standalone`) — QA-verified. Runs as non-root `node`, listens on port 3000. |
| Data | One SQLite file at **`/app/data/dev.db`** inside the container; persisted via a **Railway Volume mounted at `/app/data`** (attached at runtime — no Dockerfile `VOLUME`, which Railway bans during build validation). |
| Startup | `docker-entrypoint.sh` applies `prisma migrate deploy` then starts the server — also creates the DB on first boot. |
| Required env | **`SESSION_SECRET`** (production fails fast without it). `PORT=3000`, `HOSTNAME=0.0.0.0`, `DATABASE_URL=file:/app/data/dev.db` are baked into the image. |
| Health probes | `GET /login` → 200 when signed out. `GET /` → 307 → `/login`. APIs → 401 without a session. |
| Security model | First-ever registration becomes **ADMIN** automatically; later registrations wait for approval. Sessions = HMAC-signed httpOnly cookie, `Secure` in production → **HTTPS required** (Railway provides it). |
| Known quirk | BUG-QA-05: page redirects can be soft (200 + NEXT_REDIRECT) in production. Accepted; no user impact. |

## 2. Host requirements (why Railway)

| Requirement | Why | Railway |
|---|---|---|
| Build/run our Dockerfile | Deploy the exact QA-verified artifact | ✅ auto-detects Dockerfile |
| Persistent disk at `/app/data` | SQLite survives deploys/restarts/reboots | ✅ volume 0.5 GB (years of headroom) |
| Single instance | SQLite = one writer | ✅ Free plan = 1 replica |
| Managed HTTPS | `Secure` cookie | ✅ `*.up.railway.app` w/ auto TLS |
| Env/secrets | `SESSION_SECRET` | ✅ Variables (encrypted at rest) |
| Always-on | UX only (cold boots) | ❌ sleeps when idle — **accepted trade-off** |

## 3. Runbook R — Railway Free (the only path)

### Phase R0 — User actions (the only clicks needed; ≈6 min total)

| # | Action | Notes |
|---|---|---|
| U1 | Open **railway.com** → **Login/Signup with GitHub** → authorize Railway to access your GitHub. | The repo (`zanesonsona/savings-tracker`) is private; the GitHub app permission covers it. |
| U2 | **New Project → Deploy from GitHub repo → `zanesonsona/savings-tracker` → Add Variables** (don't pick *Deploy Now* yet — we want the variables in before the first boot). | Paste the two variables I give you (§4): `SESSION_SECRET=…` and `RAILWAY_RUN_UID=0`. Then hit **Deploy**. |
| U3 | Wait for the build (5–10 min on first deploy; it's `npm ci` + Next build). | I'll provide the exact click path + values when you're ready (§4). |
| U4 | **The moment I confirm the app responds**, open `https://<your-service>.up.railway.app/register` and register your admin account (first signup = admin). Save the password + `SESSION_SECRET` in your password manager. | Security-critical ordering — do it in the same sitting (§7). |

### Phase R1 — Setup I walk you through in the dashboard (≈4 min)

| # | Step | Where (current Railway UI) |
|---|---|---|
| R1 | Create project + service from the repo (you click; I provide the exact values) | Dashboard → New Project → Deploy from GitHub repo |
| R2 | Variables: `SESSION_SECRET` (I generated; §4) · `RAILWAY_RUN_UID=0` (Railway's documented fix — our image runs as non-root `node`, their volumes mount root-owned) | Service → **Variables** |
| R3 | **Volume**: mount path `/app/data`, 0.5 GB (Free max) | Service → right-click/canvas → **Add Volume** → mount `/app/data` |
| R4 | **Serverless**: enable, then trigger a redeploy so the setting applies to the running container | Service → **Settings → Deploy → Serverless** → toggle on → redeploy |
| R5 | **Domain**: Generate Domain → `https://<name>.up.railway.app` (HTTPS included) | Service → **Settings → Networking** |
| R6 | Optional: region — keep default (or Singapore if offered in the modal; only affects latency) | Project settings |

### Phase R2 — Verification (me, after U3/R5)

| # | Check | Expected |
|---|---|---|
| V1 | Build/deploy logs | `Applying database migrations…` → `Starting Savings Tracker on port 3000…` → ready |
| V2 | `curl -sI https://<domain>/login` | **200** |
| V3 | `curl -sI https://<domain>/` | **307** → `/login` (or 200 soft-redirect, accepted BUG-QA-05) |
| V4 | `GET /api/...` without session | **401** |
| V5 | First cold boot after idle | 5–30 s; retry once on 502 |

### Phase R3 — Go live + admin claim (you + me)

| # | Step | Who |
|---|---|---|
| G1 | Register your admin account at `https://<domain>/register` — the moment I say it's verified | **you** |
| G2 | I POST a throwaway registration (`deploy-check-…`) → expect "awaiting admin approval" → proves an admin exists → **you reject it** on `/admin/users` | me → you |
| G3 | Sign in → create your first categories → log a test income/expense | you |
| G4 | Done-conditions: HTTPS + login OK · probes green · DB empty except your account | me |

## 4. Railway configuration values (the only two variables)

| Variable | Value | Notes |
|---|---|---|
| `SESSION_SECRET` | *shown by me at U2 time* — generated with `openssl rand -base64 32`, stored at `~/.savings-session-secret.txt` on your machine (chmod 600) | Never commit; changing it signs everyone out. |
| `RAILWAY_RUN_UID=0` | `0` | Railway's documented fix for volumes + non-root images (our container runs as `node` uid 1000). |

Everything else is baked into the image. **One Dockerfile exception (2026-10-19):** the `VOLUME` instruction was removed — Railway bans that keyword during build validation; storage is attached at runtime instead. The Railway CLI is used only for backups/logs, not for deploying.

## 5. Backups, updates, failure modes

- **Backups (tested 2026-10-19):** `~/savings-backups/backup.sh` pulls `/dev.db` from the Railway volume (`railway volume files download`), verifies it with `check.cjs` (`PRAGMA integrity_check` + tables/users dump), and keeps the 14 newest copies in `~/savings-backups/`. Run it monthly and before any risky change. First copies: `dev-2026-10-19.db` (pre-restart) and `dev-2026-10-19_1404.db` (post-restart) — both `integrity_check=ok`.
- **CLI setup (done):** `~/.railway/bin/railway` v5.70.0 (official installer), signed in as the workspace owner, linked to project `precious-hope` → service `savings-tracker` (the link is keyed to the repo directory). SSH key `savings-cli` registered — volume file access requires it.
- **Logs/ops:** `railway logs -d --lines 100` (deploy logs) · `railway service restart -y` — note this CLI build can exit with a timeout *after* performing the restart; confirm by a fresh `Mounting volume` / `Starting Savings Tracker on port 8080…` boot in the logs, not by the exit code.
- **Custom domain (optional):** adding a domain you already own is **free** on Railway (automatic TLS; CNAME + TXT records). Buying the domain itself costs ~$10–15/yr — the free `*.up.railway.app` URL works identically (HTTPS + secure cookies).
- **Updates:** push to `main` → Railway auto-redeploys (rebuild from Dockerfile; migrations run at boot). Rollback = redeploy a previous build from the Deployments menu (Free keeps 24 h of images).
- **Cold boots:** first visit after ≥5–10 min idle takes 5–30 s; a rare 502 on the very first hit — retry once. This is the accepted cost of $0 + no card.
- **Usage ceiling:** Free = $1/month credit (no rollover); if exceeded, workloads pause until the cycle resets — **volume data survives**. Light personal use projects ≈ $0.15–0.40/month of usage. Optional: email alert at the workspace Usage page.
- **Free-tier changes:** Railway has repriced before; our portability story = Dockerfile + volume snapshot → any other Docker host in ~30 min (§6).
- **If it sleeps too annoyingly:** two upgrade paths — (a) tiny external keep-warm pinger, (b) migrate to Oracle Always Free (always-on, no sleep; §6).

## 6. Fallbacks (kept for reference — not needed for the primary path)

- **Oracle Cloud Always Free (≈30 min, card for identity verification, always-on, no cold boots):** buy an E2.1.Micro in Singapore (or A1); install Docker; run the same image with a docker-compose + Caddy for auto-HTTPS; data on a host directory + nightly `sqlite3 .backup` cron. Nothing in this plan changes for that migration; skip nothing else.
- **GCP e2-micro:** same shape as Oracle but US-only free regions + 1 GB/month egress cap.
- **Own PC + Tailscale Funnel:** run the image locally and expose via `tailscale funnel 3000` — works only while your PC is on. Emergency option.

## 7. Security & failure modes

1. **First-signup race:** anyone who reaches the URL before you register could become admin. Mitigation: keep the URL private, register immediately after go-live. **Remediation:** Railway → volume files → delete `/app/data/dev.db` → restart service → fresh empty DB → register again.
2. **No password reset feature:** choose a strong admin password; store it + the `SESSION_SECRET` in your password manager. Worst case I rewrite the scrypt hash via `railway ssh`.
3. **HTTPS is mandatory** (production cookies are `Secure`); Railway gives TLS on the generated domain automatically.
4. `SESSION_SECRET` sample in `.env.example` is public — never reuse it; we generated a fresh one.
5. Backups contain all account data + password hashes — keep them private.
6. Free-plan pausing: hitting the $1 cap pauses workloads but **does not delete data**; if the account goes inactive, Railway deletes free-plan data after 30 days — keep the secondary backup.

## 8. Repo & environment notes

- `deployment_plan.md` is committed to the repo (this file). No other repo changes are required for Railway.
- The deploy build context comes from git (`.dockerignore` excludes local DB / `.env` files). The app's `.env` in the repo is **not** used in production.
- Cosmetic quirks on this Windows/WSL workstation: git can't track the exec bit on the UNC path (the Dockerfile sets it with `chmod +x` anyway), and line endings may flip when files are edited from Windows. Neither affects builds or runtime.
- Deploy only from committed, gate-green revisions (this session's gates: **87/87 tests, lint clean, build OK**).

## 9. Execution log

| Date | Step | Result | By |
|---|---|---|---|
| 2026-10-19 | Gates re-run for deploy revision | ✅ 87/87 tests · lint clean · build OK | me |
| 2026-10-19 | `SESSION_SECRET` generated + stored | ✅ `~/.savings-session-secret.txt` (chmod 600) | me |
| 2026-10-19 | Plan v3 (Railway-only) written + committed | ✅ commit `60ab2e5` | me |
| 2026-10-19 | First Railway build rejected — `VOLUME` keyword banned in Dockerfiles | ✅ removed from Dockerfile, pushed for rebuild | me |
| 2026-10-19 | App live at `savings-tracker-production-e934.up.railway.app` | ✅ probes: `/login` 200 · `/` → 307 · `/register` 200 · API 401 | me |
| 2026-10-19 | Phase R0: project + deploy + domain + volume + serverless | ✅ volume `savings-tracker-volume` @ `/app/data` (500 MB) · serverless on · region iad | you |
| 2026-10-19 | Phase R3: admin claim | ✅ first account `zanesonsona` = ADMIN/APPROVED | you |
| 2026-10-19 | Phase R3: approval flow e2e | ✅ throwaway `deploy-check-e934` → PENDING → rejected by admin → login 403 "declined" | me |
| 2026-10-19 | Restart/persistence test | ✅ boot 2→3 with volume mounted; "No pending migrations to apply"; probes + declined state intact | me |
| 2026-10-19 | First backups + script | ✅ `dev-2026-10-19.db`, `dev-2026-10-19_1404.db` · `integrity_check=ok` · `~/savings-backups/backup.sh` tested | me |
