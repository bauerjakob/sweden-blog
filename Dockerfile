# syntax=docker/dockerfile:1

# --- Stage 1: install deps + build the frontend ---------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Toolchain for compiling native modules (better-sqlite3 has no musl prebuild).
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# --- Stage 2: run the Node server (API + static + SSR Open Graph) ----------
FROM node:22-alpine AS serve
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Bring over the pruned (production-only) node_modules and just what the server
# needs at runtime: the built frontend, the seed content + photos, the server.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/content ./content
COPY --from=build /app/public ./public
COPY --from=build /app/src/content/photos.manifest.json ./src/content/photos.manifest.json

# SQLite database + uploaded photos live here; mount a volume to persist them.
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server/index.mjs"]
