/**
 * Platform Metrics — SLO tracking for Advisacor's cutting-edge targets.
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface RecordMetricInput {
  firmClientId?: string;
  metricName: string;
  metricValue: number;
  metricUnit: "ms" | "seconds" | "hours" | "count" | "percentage" | "usd";
  dimensions?: Record<string, unknown>;
  sloTarget?: number;
  sloMet?: boolean;
}

export async function recordMetric(input: RecordMetricInput): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("platform_metrics").insert({
    firm_client_id: input.firmClientId ?? null,
    metric_name: input.metricName,
    metric_value: input.metricValue,
    metric_unit: input.metricUnit,
    dimensions: input.dimensions ?? {},
    slo_target: input.sloTarget ?? null,
    slo_met: input.sloMet ?? null,
  });
  if (error) {
    // Non-blocking; metrics failure should never block a business action
    console.warn("[platform_metrics] insert failed:", error.message);
  }
}

// Standard SLO targets for Advisacor's cutting-edge posture
export const SLO_TARGETS = {
  categorization_latency_ms: 5 * 60 * 1000, // 5 minutes
  je_post_latency_ms: 1000, // 1 second
  intake_to_bill_latency_ms: 60 * 1000, // 1 minute
  full_close_duration_hours: 48, // 2 days top quartile
  cash_app_straight_through_pct: 90, // 90% straight-through
  ocr_extraction_accuracy_pct: 99, // 99%+ with vendor template memory
  assertion_coverage_pct: 95, // 95%+ of relevant assertions tested
} as const;
