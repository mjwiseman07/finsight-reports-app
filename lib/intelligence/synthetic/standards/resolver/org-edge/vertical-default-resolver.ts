/**
 * LOCK-VC C6 — entity > org > vertical-default precedence resolver.
 */
import type { ReportingBasis } from "../../../../../../src/verticals/manufacturing/types";
import type { OrgDefaults } from "./org-defaults";
import { DEFAULT_ORG_DEFAULTS } from "./org-defaults";

export class ReportingBasisChangeAfterFirstCloseError extends Error {
  constructor(tenantId: string) {
    super(`Reporting basis change after first close requires migration event (tenant ${tenantId})`);
    this.name = "ReportingBasisChangeAfterFirstCloseError";
  }
}

export function resolveReportingBasis(
  entity: { reportingBasis?: ReportingBasis },
  org: OrgDefaults = DEFAULT_ORG_DEFAULTS,
  verticalDefault: ReportingBasis = "US_GAAP",
): ReportingBasis {
  if (entity.reportingBasis) {
    return entity.reportingBasis;
  }
  if (org.reportingBasis) {
    return org.reportingBasis;
  }
  return verticalDefault;
}

export function resolveFiscalYearEnd(
  entity: { fiscalYearEnd?: string },
  org: OrgDefaults = DEFAULT_ORG_DEFAULTS,
  verticalDefault = "12-31",
): string {
  if (entity.fiscalYearEnd) {
    return entity.fiscalYearEnd;
  }
  if (org.fiscalYearEnd) {
    return org.fiscalYearEnd;
  }
  return verticalDefault;
}

export function assertReportingBasisChangePermitted(
  tenantId: string,
  org: OrgDefaults,
  isFirstClose: boolean,
): void {
  if (!isFirstClose && org.reportingBasisLockedAtFirstClose) {
    throw new ReportingBasisChangeAfterFirstCloseError(tenantId);
  }
}
