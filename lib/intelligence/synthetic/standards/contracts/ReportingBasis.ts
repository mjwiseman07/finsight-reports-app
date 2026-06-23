import type { StandardsReportingFramework } from "./StandardsContracts";

export type ReportingBasis = "US_GAAP" | "IFRS";

/** Maps full accounting enum to binary panel-router discriminator. */
export function basisOf(fw: StandardsReportingFramework): ReportingBasis {
  return fw === "us_gaap" ? "US_GAAP" : "IFRS";
}
