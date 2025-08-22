FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun --bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

RUN mkdir /data 

# Copy core files
COPY --from=builder  /app/.next/standalone ./
COPY --from=builder  /app/public ./public
COPY --from=builder  /app/.next/static ./.next/static

# Copy drizzle
COPY --from=builder  /app/drizzle.config.ts ./
COPY --from=builder  /app/migrate.ts ./
COPY --from=builder  /app/src/db ./src/db
COPY --from=builder  /app/drizzle ./drizzle

# Copy node_modules
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm


COPY  entrypoint.sh .

RUN chmod +x ./entrypoint.sh


EXPOSE 3000
ENV PORT=3000

ENV DB_FILE_NAME=/data/db.sqlite

ENTRYPOINT ["./entrypoint.sh"]
