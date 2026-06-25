// PHASE 42.7A.3 — FA Wave 2 shim. Delegates to universal TreatmentResolver pure core.
// Citation: ASC_946_INVESTMENT_COMPANIES (industry default).

import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";
import { resolveTreatmentPure } from "../../../standards/resolver/resolveTreatmentPure";
import {
  buildShimTreatmentContext,
  frameworkCodeToStandardsReportingFramework,
  normalizeToLegacyBasis,
  type LegacyReportingBasis,
} from "../../../standards/resolver/shimContextBuilder";

export function resolveReportingFramework(
  reportingBasis: LegacyReportingBasis | ReportingBasis,
  companyId?: string,
): StandardsReportingFramework {
  const context = buildShimTreatmentContext({
    reportingBasis: normalizeToLegacyBasis(reportingBasis),
    industry: "FUND_ACCOUNTING",
    companyId,
  });
  const resolution = resolveTreatmentPure(context);
  if (resolution.chosenFramework === null) {
    throw new Error(
      `resolveReportingFramework(FA): unresolved conflict for basis "${reportingBasis}"`,
    );
  }
  return frameworkCodeToStandardsReportingFramework(resolution.chosenFramework);
}
