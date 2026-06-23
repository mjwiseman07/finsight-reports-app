import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";

/** J-02: binary IFRS at UI maps to internal ifrs_iasb default. */
export function resolveReportingFramework(reportingBasis: ReportingBasis): StandardsReportingFramework {
  return reportingBasis === "US_GAAP" ? "us_gaap" : "ifrs_iasb";
}
