#!/bin/sh
# Container entrypoint: apply pending Prisma migrations (creates dev.db on the
# first boot), then start the standalone Next.js server.

set -e

echo "Applying database migrations…"
node /app/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma

echo "Starting Savings Tracker on port ${PORT:-3000}…"
exec node /app/server.js
