# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec vite build

FROM caddy:2-alpine

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

ENV ADMIN_LISTEN=:8080 \
    BEAVA_ADMIN_UPSTREAM=http://host.docker.internal:8082 \
    BEAVA_DATA_UPSTREAM=http://host.docker.internal:8081

EXPOSE 8080
