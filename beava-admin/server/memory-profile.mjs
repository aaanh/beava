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
const PROCESS_NAME = safeProcessName(
  process.env.BEAVA_PROCESS_NAME?.trim() || "beava"
)
const DOCKER_SOCK = process.env.DOCKER_HOST ?? "/var/run/docker.sock"

function safeProcessName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : "beava"
}

function dockerEnv() {
  return { ...process.env, DOCKER_HOST: DOCKER_SOCK }
}

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

function rssKbFromPid(pid) {
  const rssKb = execFileSync("ps", ["-o", "rss=", "-p", pid], {
    encoding: "utf8",
  }).trim()
  const kb = Number(rssKb)
  if (!Number.isFinite(kb) || kb <= 0) {
    return undefined
  }
  return kb
}

function rssFromPid(pid) {
  const kb = rssKbFromPid(pid)
  return kb === undefined ? undefined : kb * 1024
}

function dockerExec(container, args) {
  return execFileSync("docker", ["exec", container, ...args], {
    encoding: "utf8",
    env: dockerEnv(),
  }).trim()
}

function dockerShell(container, script) {
  return execFileSync("docker", ["exec", container, "sh", "-c", script], {
    encoding: "utf8",
    env: dockerEnv(),
  }).trim()
}

/** Host PID of the container's init process (Linux: maps to in-container PID 1). */
function containerInitHostPid(container) {
  const raw = execFileSync(
    "docker",
    ["inspect", "-f", "{{.State.Pid}}", container],
    { encoding: "utf8", env: dockerEnv() }
  ).trim()
  const pid = Number(raw)
  return Number.isFinite(pid) && pid > 0 ? String(pid) : undefined
}

/**
 * Resolve the beava process PID inside the container via ps/pgrep.
 * Falls back to PID 1 for single-process images.
 */
function findBeavaPidInContainer(container) {
  try {
    const viaPgrep = dockerShell(
      container,
      `pgrep -xo '${PROCESS_NAME}' 2>/dev/null || true`
    )
    if (viaPgrep) {
      return viaPgrep.split("\n")[0].trim()
    }
  } catch {
    // pgrep missing on minimal images
  }

  try {
    const viaPs = dockerShell(
      container,
      `ps -eo pid,args 2>/dev/null | awk 'NR>1 && $0 ~ /${PROCESS_NAME}/ { print $1; exit }'`
    )
    if (viaPs) {
      return viaPs.split("\n")[0].trim()
    }
  } catch {
    // ignore
  }

  return "1"
}

/** ps RSS inside the container for the beava process (KiB → bytes). */
function rssFromDockerExec(container) {
  if (!existsSync(DOCKER_SOCK)) {
    return undefined
  }

  const pid = findBeavaPidInContainer(container)
  let rssKb
  try {
    const raw = dockerExec(container, ["ps", "-o", "rss=", "-p", pid])
    rssKb = Number(raw)
  } catch {
    return undefined
  }

  if (!Number.isFinite(rssKb) || rssKb <= 0) {
    return undefined
  }

  return {
    bytes: rssKb * 1024,
    containerPid: pid,
  }
}

/** Host /proc RSS for container init PID (single-process images on Linux). */
function rssFromContainerInitOnHost(container) {
  if (!existsSync(DOCKER_SOCK)) {
    return undefined
  }
  const hostPid = containerInitHostPid(container)
  if (hostPid === undefined) {
    return undefined
  }
  const bytes = rssFromPid(hostPid)
  if (bytes === undefined) {
    return undefined
  }
  return { bytes, containerPid: "1", hostPid }
}

function rssFromDockerStats(container) {
  if (!existsSync(DOCKER_SOCK)) {
    return undefined
  }
  const raw = execFileSync(
    "docker",
    ["stats", container, "--no-stream", "--format", "{{.MemUsage}}"],
    { encoding: "utf8", env: dockerEnv() }
  )
  const bytes = parseDockerMemUsage(raw)
  return bytes === undefined ? undefined : { bytes }
}

export function sampleProcessMemory() {
  if (PID) {
    const bytes = rssFromPid(PID)
    if (bytes !== undefined) {
      return {
        processResidentBytes: bytes,
        source: "pid",
        processPid: PID,
      }
    }
  }

  if (CONTAINER) {
    const execSample = rssFromDockerExec(CONTAINER)
    if (execSample !== undefined) {
      return {
        processResidentBytes: execSample.bytes,
        source: "docker-exec",
        container: CONTAINER,
        processPid: execSample.containerPid,
        detail: `ps RSS for '${PROCESS_NAME}' inside ${CONTAINER}`,
      }
    }

    const hostSample = rssFromContainerInitOnHost(CONTAINER)
    if (hostSample !== undefined) {
      return {
        processResidentBytes: hostSample.bytes,
        source: "docker-exec",
        container: CONTAINER,
        processPid: hostSample.containerPid,
        hostPid: hostSample.hostPid,
        detail: `host ps RSS for container init (PID 1 → host ${hostSample.hostPid})`,
      }
    }

    const statsSample = rssFromDockerStats(CONTAINER)
    if (statsSample !== undefined) {
      return {
        processResidentBytes: statsSample.bytes,
        source: "docker-stats",
        container: CONTAINER,
        detail: "docker stats MemUsage fallback (whole container, noisier)",
      }
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
