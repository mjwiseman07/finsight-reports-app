import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface InsuranceExtracted {
  gaapBasis: "US-GAAP" | "IFRS";
  naicFilerFlag: boolean;
  hasShortDurationContracts: boolean;
  hasLongDurationContracts: boolean;
  hasMarketRiskFeature: boolean;
  hasVariableAnnuityProducts: boolean;
  hasDirectParticipatingFeatures: boolean;
  ldtiApplicabilityFlag: boolean;
  cessionPercentage: number;
  reinsuranceRecoverable?: {
    grossRecoverable: number;
    cededReserves: number;
    creditAllowance: number;
  };
  premiumsReceivable: number;
  premiumsReceivableCECLAllowance: number;
  lossReserves?: {
    caseReserves: number;
    ibnr: number;
    totalIncurred: number;
    paidLossesYTD: number;
    developmentTriangle?: Record<string, number[]>;
  };
  longDuration?: {
    liabilityForFuturePolicyBenefits: number;
    dacBalance: number;
    dacAmortizationBase: "premium" | "gross-profit" | "constant-level";
    mrbFairValue?: number;
  };
  variableAnnuityBlock?: {
    accountValueGross: number;
    gmdbFlag: boolean;
    gmwbFlag: boolean;
    gmibFlag: boolean;
  };
  ifrs17?: {
    paaEligible: boolean;
    paaEligibilityRationale?: string;
    hasDirectParticipatingFeatures: boolean;
    vfaQualification?: {
      sharesPoolOfUnderlyingItems: boolean;
      insurerPaysSubstantialShare: boolean;
      cashFlowsVaryWithUnderlying: boolean;
    };
    riskAdjustmentMethodology: "confidence-level" | "cost-of-capital" | "other";
    contractBoundaryRationale?: string;
    transitionApproach?: "full-retrospective" | "modified-retrospective" | "fair-value";
    annualCohortGrouping: boolean;
  };
  sap?: {
    rbcRatio: number;
    rbcActionLevel:
      | "no-action"
      | "company"
      | "regulatory"
      | "authorized-control"
      | "mandatory-control";
    statutoryNetIncome: number;
    statutorySurplus: number;
    annualStatementType: "P&C-yellow" | "Life-blue" | "Health-orange" | "Title-brown";
  };
}

export interface InsuranceEmitterInput {
  extracted: ExtractedFiling;
  insurance: InsuranceExtracted;
  narrativeHaystack: string;
}

export function getInsurance(extracted: ExtractedFiling): InsuranceExtracted {
  if (!extracted.insurance) {
    throw new Error("Missing insurance block on ExtractedFiling");
  }
  return extracted.insurance;
}

export function buildInsuranceEmitterInput(extracted: ExtractedFiling): InsuranceEmitterInput {
  return {
    extracted,
    insurance: getInsurance(extracted),
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function isUsGaapInsurance(ins: InsuranceExtracted): boolean {
  return ins.gaapBasis === "US-GAAP";
}

export function isIfrsInsurance(ins: InsuranceExtracted): boolean {
  return ins.gaapBasis === "IFRS";
}

export function hasLossReservesInput(ins: InsuranceExtracted): boolean {
  const lr = ins.lossReserves;
  return Boolean(
    lr &&
      typeof lr.caseReserves === "number" &&
      typeof lr.ibnr === "number" &&
      typeof lr.totalIncurred === "number",
  );
}

export function hasDevelopmentTriangle(ins: InsuranceExtracted): boolean {
  const triangle = ins.lossReserves?.developmentTriangle;
  return Boolean(triangle && Object.keys(triangle).length > 0);
}

export function hasReinsuranceInput(ins: InsuranceExtracted): boolean {
  return ins.cessionPercentage > 0 && Boolean(ins.reinsuranceRecoverable);
}

export function hasLongDurationInput(ins: InsuranceExtracted): boolean {
  const ld = ins.longDuration;
  return Boolean(
    ins.hasLongDurationContracts &&
      ld &&
      typeof ld.liabilityForFuturePolicyBenefits === "number" &&
      typeof ld.dacBalance === "number",
  );
}

export function hasIfrs17Input(ins: InsuranceExtracted): boolean {
  return Boolean(ins.ifrs17 && ins.gaapBasis === "IFRS");
}

export function hasSapInput(ins: InsuranceExtracted): boolean {
  return Boolean(ins.naicFilerFlag && ins.sap && typeof ins.sap.rbcRatio === "number");
}

export function vfaFullyQualified(ins: InsuranceExtracted): boolean {
  const v = ins.ifrs17?.vfaQualification;
  return Boolean(
    v &&
      v.sharesPoolOfUnderlyingItems &&
      v.insurerPaysSubstantialShare &&
      v.cashFlowsVaryWithUnderlying,
  );
}
