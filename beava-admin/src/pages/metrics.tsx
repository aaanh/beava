import { MetricsOverview } from "@/components/metrics-overview"
import { PageShell } from "@/components/page-shell"

export default function MetricsPage() {
  return (
    <PageShell
      title="Metrics"
      description="Prometheus exposition from admin /metrics. Counter rates use deltas between polls."
    >
      <MetricsOverview />
    </PageShell>
  )
}
