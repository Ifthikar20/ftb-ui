# ── Stage 1: Build Vue app ──
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

# Cache-bust on every CI build so identical file mtimes never serve a stale layer.
ARG CACHE_DATE=unknown
COPY . .
RUN npm run build

# ── Stage 2: Hold dist for copy-to-volume on consumer ──
FROM alpine:3.19

COPY --from=build /app/dist /build

# Consumer compose mounts a named volume at /app/dist; this CMD copies fresh
# build artifacts into that volume on each `compose run --rm frontend`.
CMD ["sh", "-c", "rm -rf /app/dist/* && cp -r /build/* /app/dist/ && echo 'Frontend build complete'"]
