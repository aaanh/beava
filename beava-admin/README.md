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

Two compose files:

| File | When |
|------|------|
| `docker-compose.yml` | beava already running (`docker run -p 8081:8080 -p 8082:8090 ...`) |
| `compose.stack.yml` | run beava + admin UI together |

```bash
cd beava-admin

# beava already on the host (root README, your port mapping)
docker compose up -d --build

# or bundle beava + admin
docker compose -f compose.stack.yml up -d --build
```

Open `http://127.0.0.1:3000`. Point the tunnel at that URL.

## 502 Bad Gateway?

The SPA loads but API calls 502 → Caddy can't reach beava upstreams.

- Confirm beava is up: `curl http://127.0.0.1:8082/health` and `curl -X POST http://127.0.0.1:8081/ping -H 'content-type: application/json' -d '{}'`
- **`docker-compose.yml`** proxies to host `:8081` (data) and `:8082` (admin) — match your `docker run -p` mapping
- **`:8081` is not TCP** in this setup; it's your published HTTP data port

Upstream env vars: `BEAVA_DATA_UPSTREAM`, `BEAVA_ADMIN_UPSTREAM` (see `.env.example`).
