#!/bin/sh
set -e

echo "Running database migrations..."
bun run migrate.ts
echo "Migrations finished successfully."

echo "Starting Next.js server..."

exec bun server.js
