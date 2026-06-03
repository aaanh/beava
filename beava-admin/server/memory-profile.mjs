#!/usr/bin/env node
/**
 * Admin-side RSS profiler for the beava process/container.
 * Not part of beava-server; scraped by the dashboard via /api/admin/memory-profile.
 */

import http from "node:http"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

const LISTEN_HOST = process.env.BEAVA_MEMORY_PROFILE_HOST ?? "127.0.0.1"
const LISTEN_PORT = Number(process.env.BEAVA_MEMORY_PROFILE_PORT ?? "8091")
const PID = process.env.BEAVA_MEMORY_PID?.trim()
const CONTAINER = process.env.BEAVA_CONTAINER_NAME?.trim()
const DOCKER_SOCK = process.env.DOCKER_HOST ?? "/var/run/docker.sock"

function parseDockerMemUsage(raw) {
  const part = raw.trim().split(/\s+/)[0] ?? ""
  const match = part.match(/^([\d.]+)\s*([KMG]i?B)$/i)
  if (!match) {
    return undefined
  }
  const value = Number(match[1])
  const unit = match[2].toUpperCase()
  const multipliers = {
    B: 1,
    KB: 1000,
    KIB: 1024,
    MB: 1000 * 1000,
    MIB: 1024 * 1024,
    GB: 1000 * 1000 * 1000,
    GIB: 1024 * 1024 * 1024,
  }
  return Math.round(value * (multipliers[unit] ?? 1))
}

function rssFromPid(pid) {
  const rssKb = execFileSync("ps", ["-o", "rss=", "-p", pid], {
    encoding: "utf8",
  }).trim()
  const kb = Number(rssKb)
  if (!Number.isFinite(kb) || kb <= 0) {
    return undefined
  }
  return kb * 1024
}

function rssFromDocker(container) {
  if (!existsSync(DOCKER_SOCK)) {
    return undefined
  }
  const raw = execFileSync(
    "docker",
    ["stats", container, "--no-stream", "--format", "{{.MemUsage}}"],
    { encoding: "utf8", env: { ...process.env, DOCKER_HOST: DOCKER_SOCK } }
  )
  return parseDockerMemUsage(raw)
}

export function sampleProcessMemory() {
  if (PID) {
    const bytes = rssFromPid(PID)
    if (bytes !== undefined) {
      return { processResidentBytes: bytes, source: "pid" }
    }
  }

  if (CONTAINER) {
    const bytes = rssFromDocker(CONTAINER)
    if (bytes !== undefined) {
      return { processResidentBytes: bytes, source: "docker" }
    }
  }

  return {
    processResidentBytes: undefined,
    source: "unavailable",
    detail:
      "Set BEAVA_MEMORY_PID (local dev) or BEAVA_CONTAINER_NAME + docker.sock (compose).",
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  })
  res.end(JSON.stringify(body))
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== "GET" || req.url?.split("?")[0] !== "/memory-profile") {
      sendJson(res, 404, { error: "not_found" })
      return
    }
    sendJson(res, 200, sampleProcessMemory())
  })
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === fileURLToPath(process.argv[1])

if (isMain) {
  createServer().listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(
      `memory-profile listening on http://${LISTEN_HOST}:${LISTEN_PORT}/memory-profile`
    )
  })
}
