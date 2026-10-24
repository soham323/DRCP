#!/bin/sh
set -e

echo "[Docker] Initializing Prisma database schema..."
npx prisma db push --skip-generate

# Run seed script if database hasn't been seeded yet
if [ ! -f /app/prisma/.docker_seeded ]; then
  echo "[Docker] Seeding initial disasters, resources, and users..."
  npx tsx prisma/seed.ts
  touch /app/prisma/.docker_seeded
  echo "[Docker] Database successfully seeded."
else
  echo "[Docker] Database already seeded. Skipping seed step."
fi

echo "[Docker] Starting DRCP API Server on port 3000..."
if [ -f dist/src/server.js ]; then
  exec node dist/src/server.js
else
  exec node dist/server.js
fi
