/**
 * LOCK-VC C6 — org-level defaults for vertical override resolution.
 */
import type { ReportingBasis } from "../../../../../../src/verticals/manufacturing/types";

export interface OrgDefaults {
  readonly reportingBasis?: ReportingBasis;
  readonly fiscalYearEnd?: string;
  readonly reportingBasisLockedAtFirstClose: boolean;
}

export const DEFAULT_ORG_DEFAULTS: OrgDefaults = Object.freeze({
  reportingBasisLockedAtFirstClose: true,
});
