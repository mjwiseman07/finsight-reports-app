// PHASE 42.7A.3 — HC Wave 2 shim → HEALTHCARE industry handle.
// Citation: ASC_606_HEALTHCARE, ASC_954_HEALTHCARE_ENTITIES.

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
    industry: "HEALTHCARE",
    companyId,
  });
  const resolution = resolveTreatmentPure(context);
  if (resolution.chosenFramework === null) {
    throw new Error(
      `resolveReportingFramework(HC): unresolved conflict for basis "${reportingBasis}"`,
    );
  }
  return frameworkCodeToStandardsReportingFramework(resolution.chosenFramework);
}
