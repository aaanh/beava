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

Start beava on the host first (data plane `:8080`, admin sidecar `:8090`), then run the UI container:

```bash
cd beava-admin
docker compose up -d --build
# open http://127.0.0.1:3000
```

Compose runs **beava-admin only**. Caddy proxies `/api/admin` and `/api/data` to `host.docker.internal` so the container can reach beava on your machine.

Override upstreams when beava listens elsewhere:

- `BEAVA_ADMIN_UPSTREAM` (default `http://host.docker.internal:8090`)
- `BEAVA_DATA_UPSTREAM` (default `http://host.docker.internal:8080`)
