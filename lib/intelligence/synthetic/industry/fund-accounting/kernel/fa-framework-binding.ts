/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-F framework binding — ASC 946 default + IFRS 10 dual-book hook.
 * Citation: ASC_946_INVESTMENT_COMPANIES, IFRS_10_CONSOLIDATION.
 */

import type { FundAccountingPanelContext } from "../../contracts/fund-accounting/FABasisContracts";
import { FrameworkMismatchViolation } from "./errors";

export type FrameworkHint = "US_GAAP" | "IFRS" | "IFRS_SME";

export function resolveEntityFramework(context: FundAccountingPanelContext): FrameworkHint {
  return context.primaryFramework;
}

export function assertFrameworkHintMatchesEntity(
  context: FundAccountingPanelContext,
  frameworkHint: FrameworkHint,
): void {
  const entityFramework = resolveEntityFramework(context);
  if (entityFramework !== frameworkHint) {
    throw FrameworkMismatchViolation(
      `Entity configured ${entityFramework} but capability invoked with ${frameworkHint} hint`,
      entityFramework,
      frameworkHint,
    );
  }
}

export function isDualBookEntity(context: FundAccountingPanelContext): boolean {
  return context.secondaryFramework !== undefined;
}

export function getDualBookFrameworks(
  context: FundAccountingPanelContext,
): [FrameworkHint, FrameworkHint] | null {
  if (!context.secondaryFramework) return null;
  return [context.primaryFramework, context.secondaryFramework];
}

/** Investment entity exception applies under IFRS 10 only — GAAP/IFRS divergence trap defense */
export function investmentEntityExceptionApplies(framework: FrameworkHint): boolean {
  return framework === "IFRS" || framework === "IFRS_SME";
}

export function getStandardsCitationHandle(
  capabilityKey: string,
  framework: FrameworkHint,
): string {
  const gaapMap: Record<string, string> = {
    "nav-daily": "ASC_946_INVESTMENT_COMPANIES",
    "nav-periodic": "ASC_946_INVESTMENT_COMPANIES",
    "fair-value-hierarchy": "ASC_820_FAIR_VALUE",
    "expense-recognition": "ASC_946_INVESTMENT_COMPANIES",
    "liability-equity-classification": "ASC_820_FAIR_VALUE",
    "capital-account-waterfall": "ASC_946_INVESTMENT_COMPANIES",
  };
  const ifrsMap: Record<string, string> = {
    "nav-daily": "IFRS_13_FAIR_VALUE",
    "nav-periodic": "IFRS_10_CONSOLIDATION",
    "fair-value-hierarchy": "IFRS_13_FAIR_VALUE",
    "expense-recognition": "IFRS_10_CONSOLIDATION",
    "liability-equity-classification": "IFRS_10_CONSOLIDATION",
    "capital-account-waterfall": "IFRS_10_CONSOLIDATION",
    "investment-entity-exception": "IFRS_10_CONSOLIDATION",
  };
  if (framework === "US_GAAP") {
    return gaapMap[capabilityKey] ?? "ASC_946_INVESTMENT_COMPANIES";
  }
  return ifrsMap[capabilityKey] ?? "IFRS_10_CONSOLIDATION";
}
