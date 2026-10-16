#!/bin/sh
set -e

echo "Waiting for the database, then syncing schema…"
npx prisma db push --skip-generate

echo "Ensuring database indexes…"
node prisma/ensure-indexes.js

echo "Seeding (idempotent)…"
node prisma/seed.js || true

echo "Starting API…"
exec node src/index.js
