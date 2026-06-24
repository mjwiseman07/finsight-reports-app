// PHASE 42.7A.3 — thin shim. Delegates to the universal TreatmentResolver
// pure core. Preserves the legacy synchronous signature so the locked
// call site `composeManufacturingVariancePanel` (MFG Wave 2 `9d3afb5`)
// continues to compile and behave identically on the inputs it produces.
//
// New call sites should use the async memory-aware `resolveTreatment`
// wrapper directly, not this shim.

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
    industry: "MANUFACTURING",
    companyId,
  });
  const resolution = resolveTreatmentPure(context);
  if (resolution.chosenFramework === null) {
    throw new Error(
      `resolveReportingFramework(MFG): unresolved conflict for basis "${reportingBasis}" — shim cannot disambiguate`,
    );
  }
  return frameworkCodeToStandardsReportingFramework(resolution.chosenFramework);
}
