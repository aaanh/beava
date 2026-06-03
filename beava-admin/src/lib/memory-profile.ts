import { beavaConfig } from "@/lib/config"

export type MemoryProfileSource =
  | "pid"
  | "docker-exec"
  | "docker-stats"
  | "unavailable"

export type MemoryProfileResponse = {
  processResidentBytes?: number
  source: MemoryProfileSource
  detail?: string
}

export type RssMemoryEstimate = {
  processResidentBytes?: number
  bytesPerEntityRss?: number
  staticBudgetBytesPerEntity?: number
  staticBudgetTotalBytes?: number
  source: MemoryProfileSource
  detail?: string
}

export async function fetchMemoryProfile(): Promise<MemoryProfileResponse> {
  const response = await fetch(`${beavaConfig.adminUrl}/memory-profile`, {
    cache: "no-store",
  })

  if (!response.ok) {
    return {
      source: "unavailable",
      detail: `memory-profile HTTP ${response.status}`,
    }
  }

  const body = (await response.json()) as MemoryProfileResponse
  return {
    processResidentBytes: body.processResidentBytes,
    source: body.source ?? "unavailable",
    detail: body.detail,
  }
}

export function buildRssMemoryEstimate(
  profile: MemoryProfileResponse,
  entityCountResident: number | undefined,
  staticBudgetBytesPerEntity: number | undefined
): RssMemoryEstimate {
  const processResidentBytes =
    profile.processResidentBytes !== undefined &&
    profile.processResidentBytes > 0
      ? profile.processResidentBytes
      : undefined

  const bytesPerEntityRss =
    processResidentBytes !== undefined &&
    entityCountResident !== undefined &&
    entityCountResident > 0
      ? Math.floor(processResidentBytes / entityCountResident)
      : undefined

  const staticBudgetTotalBytes =
    staticBudgetBytesPerEntity !== undefined &&
    entityCountResident !== undefined &&
    entityCountResident > 0
      ? staticBudgetBytesPerEntity * entityCountResident
      : undefined

  return {
    processResidentBytes,
    bytesPerEntityRss,
    staticBudgetBytesPerEntity,
    staticBudgetTotalBytes,
    source: profile.source,
    detail: profile.detail,
  }
}
