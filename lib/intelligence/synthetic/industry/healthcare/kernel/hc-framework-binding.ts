/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-F framework binding — ASC 606 healthcare + IFRS 15 dual-book.
 */

import type { HealthcarePanelContext } from "../../contracts/healthcare/HCBasisContracts";
import { FrameworkMismatchViolation } from "./errors";

export type FrameworkHint = "US_GAAP" | "IFRS" | "IFRS_SME";

export function assertFrameworkHintMatchesEntity(
  context: HealthcarePanelContext,
  frameworkHint: FrameworkHint,
): void {
  if (context.primaryFramework !== frameworkHint) {
    throw FrameworkMismatchViolation(
      `Entity configured ${context.primaryFramework} but capability invoked with ${frameworkHint}`,
      context.primaryFramework,
      frameworkHint,
    );
  }
}

export function isDualBookEntity(context: HealthcarePanelContext): boolean {
  return context.secondaryFramework !== undefined;
}

export function getDualBookFrameworks(
  context: HealthcarePanelContext,
): [FrameworkHint, FrameworkHint] | null {
  if (!context.secondaryFramework) return null;
  return [context.primaryFramework, context.secondaryFramework];
}

export function getStandardsCitationHandle(
  capabilityKey: string,
  framework: FrameworkHint,
): string {
  const gaap: Record<string, string> = {
    "net-revenue-recognition": "ASC_606_HEALTHCARE",
    "contractual-allowances": "ASC_606_HEALTHCARE",
    "charity-care": "ASC_954_HEALTHCARE_ENTITIES",
    "bad-debt": "ASC_606_HEALTHCARE",
    "disclosures-npsr": "ASC_954_HEALTHCARE_ENTITIES",
    "501r-charity-care": "IRS_501R",
  };
  const ifrs: Record<string, string> = {
    "net-revenue-recognition": "IFRS_15_REVENUE",
    "contractual-allowances": "IFRS_15_REVENUE",
    "charity-care": "IAS_1_PRESENTATION",
    "bad-debt": "IFRS_15_REVENUE",
    "disclosures-npsr": "IAS_1_PRESENTATION",
  };
  if (framework === "US_GAAP") {
    return gaap[capabilityKey] ?? "ASC_954_HEALTHCARE_ENTITIES";
  }
  return ifrs[capabilityKey] ?? "IFRS_15_REVENUE";
}

export function assert501rExplicitConfig(context: HealthcarePanelContext): void {
  if (context.nonprofitHospital501r !== true) {
    throw FrameworkMismatchViolation(
      "501(r) requires explicit nonprofitHospital501r config flag",
      "unset",
      "501r-required",
    );
  }
}
