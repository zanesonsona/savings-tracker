# Production image for the Savings Tracker (Next.js standalone + Prisma/SQLite).
#
# Build: docker build -t savings-tracker .
# Run:   docker run --rm -p 3000:3000 -v savings-data:/app/data savings-tracker
#
# The SQLite database lives at /app/data/dev.db inside the container
# (DATABASE_URL default below); attach persistent storage there to keep your data.
# Pending Prisma migrations are applied automatically on every start.

# ---------- Stage 1: dependencies ----------
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Complete, isolated Prisma CLI install (incl. all transitive deps) used by the
# runtime entrypoint for `migrate deploy`. Version pinned to the one the
# lockfile installed — copying individual @prisma/* folders is not enough
# (the CLI also pulls packages like `effect`).
RUN mkdir -p /prisma-cli \
  && cd /prisma-cli \
  && npm install --no-audit --no-fund prisma@$(node -p 'require("/app/node_modules/prisma/package.json").version')

# ---------- Stage 2: build ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Prisma engines use OpenSSL; Debian slim ships libssl3 but not the CLI.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Absolute URL: dev.db is intentionally not copied into the image, and the
# runtime database always lives under /app/data (persistent storage). `prisma
# generate` must run before `next build` so the client is traced into the
# standalone output.
ENV DATABASE_URL="file:/app/data/dev.db"
RUN npx prisma generate && npm run build

# ---------- Stage 3: runtime ----------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="file:/app/data/dev.db"

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data \
  && chown node:node /app/data

# Minimal standalone server + static assets (requires `output: "standalone"`).
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Generated Prisma client + query engine (belt-and-suspenders over NFT tracing).
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

# Prisma schema + migrations + CLI so the entrypoint can apply migrations.
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=deps --chown=node:node /prisma-cli/node_modules ./node_modules

COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 3000
# NOTE: no storage-path declaration on purpose — Railway forbids it in
# Dockerfiles. Attach persistence at runtime instead:
#   local:   docker run ... -v savings-data:/app/data
#   Railway: storage mount at /app/data

ENTRYPOINT ["docker-entrypoint.sh"]
