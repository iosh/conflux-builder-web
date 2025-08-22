#!/bin/sh
set -e

echo "Running database migrations..."
bun run migrate.ts
echo "Migrations finished successfully."

echo "Starting Next.js server..."

exec HOSTNAME=0.0.0.0 PORT=3000 bun server.js
