#!/bin/sh
set -e

echo "Running database migrations..."
bun run migrate.ts
echo "Migrations finished successfully."

echo "Starting Next.js server..."

export HOSTNAME=0.0.0.0
export PORT=3000
exec bun server.js
