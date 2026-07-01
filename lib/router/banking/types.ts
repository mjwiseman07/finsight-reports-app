import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface BankingExtracted {
  gaapBasis: "us-gaap" | "ifrs";
  secFilerFlag: boolean;
  callReportForm?: "031" | "041" | "051";
  reportingEntity: "BHC" | "bank-subsidiary";
  totalAssets: number;
  aociOptOutElection: boolean;
  hasLoansHFI: boolean;
  loansHFI?: {
    totalAmortizedCost: number;
    allowanceForCreditLosses: number;
    ceclMethodology: "WARM" | "PD-LGD-EAD" | "vintage" | "loss-rate" | "DCF";
    portfolioSegmentation: Array<{
      segment: string;
      amortizedCost: number;
      allowance: number;
      riskRating?: string;
    }>;
    nonaccrualBalance: number;
    chargeOffsYTD: number;
    recoveriesYTD: number;
  };
  hasAFSDebtSecurities: boolean;
  hasHTMDebtSecurities: boolean;
  afsDebtFairValue?: number;
  afsDebtAmortizedCost?: number;
  afsDebtUnrealizedLoss?: number;
  htmDebtAmortizedCost?: number;
  htmDebtFairValue?: number;
  htmSaleDuringPeriod: boolean;
  htmPermittedExceptionFlag?: boolean;
  obsCommitments: number;
  obsFinancialGuarantees: number;
  hedgePortfolio?: {
    cashFlowHedges: number;
    fairValueHedges: number;
    portfolioLayerHedges: number;
    netInvestmentHedges: number;
    hedgeDocumentationFlag: boolean;
  };
  regulatoryCapital?: {
    cet1Capital: number;
    tier1Capital: number;
    totalCapital: number;
    riskWeightedAssets: number;
    cet1Ratio: number;
    tier1Ratio: number;
    totalCapitalRatio: number;
    tier1LeverageRatio: number;
  };
  ifrs9?: {
    stage1AmortizedCost: number;
    stage2AmortizedCost: number;
    stage3AmortizedCost: number;
    stage1ECL: number;
    stage2ECL: number;
    stage3ECL: number;
    sppiTestPass: boolean;
    businessModel: "hold-to-collect" | "hold-to-collect-and-sell" | "other";
  };
}

export interface BankingEmitterInput {
  extracted: ExtractedFiling;
  banking: BankingExtracted;
  narrativeHaystack: string;
}

export function getBanking(extracted: ExtractedFiling): BankingExtracted {
  if (!extracted.banking) {
    throw new Error("Missing banking block on ExtractedFiling");
  }
  return extracted.banking;
}

export function buildBankingEmitterInput(extracted: ExtractedFiling): BankingEmitterInput {
  return {
    extracted,
    banking: getBanking(extracted),
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function isUsGaapBanking(b: BankingExtracted): boolean {
  return b.gaapBasis === "us-gaap";
}

export function isIfrsBanking(b: BankingExtracted): boolean {
  return b.gaapBasis === "ifrs";
}

export function hasInScopeCeclAssets(b: BankingExtracted): boolean {
  return (
    b.hasLoansHFI ||
    (b.hasAFSDebtSecurities && (b.afsDebtUnrealizedLoss ?? 0) > 0) ||
    b.hasHTMDebtSecurities ||
    b.obsCommitments > 0
  );
}

export function scopeQualifier(b: BankingExtracted): string {
  return b.reportingEntity === "BHC" ? "BHC consolidated scope" : "bank subsidiary scope";
}

export function hasRegulatoryCapital(b: BankingExtracted): boolean {
  return Boolean(b.regulatoryCapital);
}

export function hasIfrs9Input(b: BankingExtracted): boolean {
  return Boolean(b.ifrs9 && b.gaapBasis === "ifrs");
}

export function hedgeDocumentationPresent(b: BankingExtracted): boolean {
  return Boolean(b.hedgePortfolio?.hedgeDocumentationFlag);
}
