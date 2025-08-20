FROM oven/bun:1 AS builder
WORKDIR /app


COPY package.json bun.lock ./


RUN bun install --frozen-lockfile


COPY . .


RUN bun --bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs


COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static


USER nextjs


EXPOSE 3000


ENV PORT=3000

ENV NODE_ENV=production

CMD ["bun", "server.js"]
