import type { AnomalySignal, VendorBaseline } from "../schema";

export function detectOffHoursSubmission(args: {
  receivedAt: string;
  baseline: VendorBaseline;
}): AnomalySignal | null {
  if (args.baseline.arrival_hour_stddev === 0) return null;
  const hour = new Date(args.receivedAt).getUTCHours();
  const rawDiff = Math.abs(hour - args.baseline.avg_arrival_hour_utc);
  const diff = Math.min(rawDiff, 24 - rawDiff); // wraparound
  const sigma = diff / args.baseline.arrival_hour_stddev;

  if (sigma <= 3) return null;

  return {
    code: "off_hours_submission",
    severity: "MEDIUM",
    evidence: {
      received_hour_utc: hour,
      baseline_hour_mean_utc: args.baseline.avg_arrival_hour_utc,
      baseline_hour_stddev: args.baseline.arrival_hour_stddev,
      sigma: Number(sigma.toFixed(2)),
      sample_size: args.baseline.sample_size,
    },
  };
}
