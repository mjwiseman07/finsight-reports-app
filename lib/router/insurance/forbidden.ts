import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { getInsurance, vfaFullyQualified } from "./types";
import { MissingDisclosureInputError } from "./errors";

export function validateInsuranceForbidden(extracted: ExtractedFiling): void {
  if (!extracted.insurance) {
    throw new MissingDisclosureInputError("insurance");
  }
  const ins = getInsurance(extracted);

  if (ins.gaapBasis === "ifrs" && ins.naicFilerFlag) {
    throw new FrameworkViolationError(
      "IFRS_17",
      "NAIC SAP under IFRS basis",
      "IFRS 17",
      "NAIC statutory accounting is US-only; set naicFilerFlag false under IFRS.",
    );
  }

  if (ins.ifrs17?.hasDirectParticipatingFeatures && !vfaFullyQualified(ins)) {
    throw new FrameworkViolationError(
      "IFRS_17",
      "VFA without all three qualification flags",
      "IFRS 17.B101",
      "Provide vfaQualification attestation for shares pool, substantial share, and cash flow variability.",
    );
  }

  if (ins.ifrs17?.paaEligible && !ins.ifrs17.paaEligibilityRationale?.trim()) {
    throw new FrameworkViolationError(
      "IFRS_17",
      "PAA eligibility without rationale",
      "IFRS 17.53",
      "Document paaEligibilityRationale when paaEligible is true.",
    );
  }

  if (ins.gaapBasis === "ifrs" && ins.ifrs17 && ins.ifrs17.annualCohortGrouping === false) {
    throw new FrameworkViolationError(
      "IFRS_17",
      "Annual cohort violation",
      "IFRS 17.22",
      "Contract groups cannot span more than one annual cohort.",
    );
  }

  if (
    ins.hasMarketRiskFeature &&
    !ins.hasLongDurationContracts &&
    typeof ins.longDuration?.mrbFairValue === "number"
  ) {
    throw new FrameworkViolationError(
      "ASC_944_LDTI",
      "MRB without long-duration contracts",
      "ASC 944-40-25-25C",
      "Market risk benefits require long-duration contract classification.",
    );
  }
}

export function assertLongDurationForLdtiEmitter(
  ins: ReturnType<typeof getInsurance>,
  emitterName: string,
): void {
  if (!ins.hasLongDurationContracts) {
    throw new FrameworkViolationError(
      "ASC_944_LDTI",
      "LDTI emitter without long-duration contracts",
      "ASC 944",
      `${emitterName} requires hasLongDurationContracts === true.`,
    );
  }
}

export function assertMarketRiskFeatureForMrb(ins: ReturnType<typeof getInsurance>): void {
  if (!ins.hasMarketRiskFeature) {
    throw new FrameworkViolationError(
      "ASC_944_LDTI",
      "MRB without market risk feature",
      "ASC 944-40-25-25C",
      "marketRiskBenefits requires hasMarketRiskFeature === true.",
    );
  }
}
