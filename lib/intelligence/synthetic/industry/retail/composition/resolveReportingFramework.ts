import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";

/** J-02 parity: binary IFRS basis maps to ifrs_iasb default framework. */
export function resolveReportingFramework(reportingBasis: ReportingBasis): StandardsReportingFramework {
  return reportingBasis === "US_GAAP" ? "us_gaap" : "ifrs_iasb";
}
