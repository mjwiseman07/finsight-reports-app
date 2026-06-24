// PHASE 42.7A.3 — thin shim. Delegates to the universal TreatmentResolver
// pure core. Preserves the legacy synchronous signature so the locked
// call site `composeRetailPerformancePanel` (RTL Wave 2 `d09b31c`)
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
): StandardsReportingFramework {
  const context = buildShimTreatmentContext({
    reportingBasis: normalizeToLegacyBasis(reportingBasis),
    industry: "RETAIL",
  });
  const resolution = resolveTreatmentPure(context);
  if (resolution.chosenFramework === null) {
    throw new Error(
      `resolveReportingFramework(RTL): unresolved conflict for basis "${reportingBasis}" — shim cannot disambiguate`,
    );
  }
  return frameworkCodeToStandardsReportingFramework(resolution.chosenFramework);
}
