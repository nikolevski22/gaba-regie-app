# ---- Image für Next.js inkl. Playwright (PDF) ----
# Basis mit vorinstalliertem Chromium + System-Libs für Headless-Chrome.
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (inkl. devDeps für Prisma-CLI, tsx, Build) ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Vollständige App inkl. node_modules (enthält Prisma-CLI, tsx, next).
# Bewusst kein Standalone-Pruning, damit Migration/Seed/Import zur Laufzeit
# verfügbar sind (npm run db:seed, npm run import:resources).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Persistente Uploads (Coolify-Volume hier mounten)
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

EXPOSE 3000
# Beim Start: DB-Schema anwenden (db push erstellt/aktualisiert Tabellen direkt
# aus schema.prisma — keine Migrationsdateien nötig, ideal für den MVP),
# dann Next.js starten. Für produktive Migrationshistorie später auf
# `prisma migrate deploy` umstellen.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
