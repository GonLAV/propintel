# syntax=docker/dockerfile:1.7
# =============================================================================
# Stage 1: production deps only (with native build tools for bcrypt)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
# The report-PDF feature uses Playwright, but its own bundled Chromium
# download targets glibc and doesn't run on Alpine's musl libc — the runtime
# stage below installs Alpine's native `chromium` package instead and points
# PLAYWRIGHT_CHROMIUM_EXECUTABLE at it, so skip Playwright's own download here.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# =============================================================================
# Stage 2: full deps (for CI / running tests inside the image if needed)
# =============================================================================
FROM node:20-alpine AS deps-dev
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# =============================================================================
# Stage 3: minimal runtime image, non-root
# =============================================================================
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    PORT=3000 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser

# Native Chromium + the fonts it needs to render Hebrew report PDFs
# (font-noto-hebrew ships proper Hebrew coverage; ttf-freefont/font-noto
# fill out other scripts so nothing renders as tofu boxes).
RUN apk add --no-cache tini chromium nss freetype harfbuzz ca-certificates \
      font-noto font-noto-hebrew ttf-freefont && \
    addgroup -S app && adduser -S app -G app

COPY --from=deps     /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app src ./src
COPY --chown=app:app sql ./sql
RUN mkdir -p /app/storage/reports && chown -R app:app /app/storage

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
