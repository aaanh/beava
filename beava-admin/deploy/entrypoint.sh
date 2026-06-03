#!/bin/sh
set -eu

node /app/server/memory-profile.mjs &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
