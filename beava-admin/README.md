# Beava Admin

Welcome to Beava Admin.

Here lives the web-based standalone metric, observability, and administrative (MOA) dashboard for beava!

# Features

- **Overview** — registry snapshot, admin health probes, and optional links out to Grafana and Prometheus
- **Metrics** — live Prometheus exposition from the admin sidecar, with counter rates computed between polls
- **Features** — browse live feature rows from the data-plane `POST /get`
- **Debug** — run debug HTTP commands, probe admin and data-plane endpoints, and inspect raw responses

# Development

Point it at a running beava instance and go:

```bash
cd beava-admin
pnpm install
pnpm dev
```

Vite proxies `/api/admin` to the admin sidecar (default `127.0.0.1:8090`) and `/api/data` to the data plane (default `127.0.0.1:8080`).

Optional env vars:

- `VITE_BEAVA_ADMIN_URL` / `VITE_BEAVA_ADMIN_PROXY_TARGET` — admin API base and dev proxy target
- `VITE_BEAVA_DATA_URL` / `VITE_BEAVA_DATA_PROXY_TARGET` — data API base and dev proxy target
- `VITE_GRAFANA_URL` / `VITE_PROMETHEUS_URL` — external observability links on Overview

Other scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

# Docker

Minimal multi-stage image: Node builds the static bundle, Caddy serves it and proxies API routes.

## Compose layouts

| File | When to use |
|------|-------------|
| `docker-compose.yml` | beava on the host, bound to `0.0.0.0` |
| `compose.host-network.yml` | Linux + Cloudflare tunnel, beava on `127.0.0.1` |
| `compose.stack.yml` | beava and admin both in Docker |

```bash
cd beava-admin

# beava running natively on the host (must listen on 0.0.0.0, not 127.0.0.1)
docker compose up -d --build

# Linux: beava on 127.0.0.1, tunnel on the same box
docker compose -f compose.host-network.yml up -d --build

# everything in Docker
docker compose -f compose.stack.yml up -d --build
```

Open `http://127.0.0.1:3000` (or point a Cloudflare tunnel at that URL).

## Why 502 Bad Gateway?

The SPA shell loads from Caddy, but `/api/admin` and `/api/data` are reverse-proxied to beava. A 502 means Caddy could not reach those upstreams.

**Default `docker-compose.yml` uses `host.docker.internal`.** Traffic from the container hits the host's network stack, not loopback. If beava binds `127.0.0.1:8080` / `127.0.0.1:8090` (the default in `beava.example.yaml`), the connection is refused.

Fix one of:

1. Bind beava on all interfaces: `listen_addr: "0.0.0.0:8080"` and `admin_addr: "0.0.0.0:8090"`
2. Use `compose.host-network.yml` so Caddy proxies to `127.0.0.1` directly
3. Use `compose.stack.yml` and proxy to the `beava` service on the Docker network

Caddy upstream env vars (see `.env.example`):

- `BEAVA_ADMIN_UPSTREAM` (default `http://host.docker.internal:8090`)
- `BEAVA_DATA_UPSTREAM` (default `http://host.docker.internal:8080`)
- `ADMIN_LISTEN` (default `:8080`, use `:3000` with host networking)
