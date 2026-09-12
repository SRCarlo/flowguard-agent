import metrics from "../data/metrics.json" with { type: "json" };

export interface ServiceMetrics {
  service: string;
  error_rate: number;
  latency_ms: number;
  requests_per_minute: number;
  cpu_percent: number;
  memory_percent: number;
  status: string;
  timestamp: string;
}

export function getServiceMetrics(service: string): ServiceMetrics | null {
  const data = metrics as Record<string, ServiceMetrics>;

  return data[service] || null;
}
