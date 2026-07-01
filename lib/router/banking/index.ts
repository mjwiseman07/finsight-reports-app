import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { validateBankingForbidden } from "./forbidden";
import {
  buildBankingEmitterInput,
  hasInScopeCeclAssets,
  hasIfrs9Input,
  isIfrsBanking,
  isUsGaapBanking,
} from "./types";
import * as ceclLoansHfi from "./usgaap/cecl-loans-hfi";
import * as ceclAfsDebt from "./usgaap/cecl-afs-debt";
import * as ceclHtmDebt from "./usgaap/cecl-htm-debt";
import * as ceclObsCommitments from "./usgaap/cecl-obs-commitments";
import * as allowanceRollforward from "./usgaap/allowance-rollforward";
import * as loanPortfolioSegmentation from "./usgaap/loan-portfolio-segmentation";
import * as nplAndChargeOffs from "./usgaap/npl-and-charge-offs";
import * as hedgeCashFlow from "./usgaap/hedge-cash-flow";
import * as hedgeFairValue from "./usgaap/hedge-fair-value";
import * as hedgePortfolioLayer from "./usgaap/hedge-portfolio-layer";
import * as investmentClassification from "./usgaap/investment-classification";
import * as htmTaintDisclosure from "./usgaap/htm-taint-disclosure";
import * as ifrs9StagedEcl from "./ifrs/ifrs9-staged-ecl";
import * as ifrs9SppiTest from "./ifrs/ifrs9-sppi-test";
import * as ifrs9HedgeAccounting from "./ifrs/ifrs9-hedge-accounting";
import * as regulatoryCapitalRatios from "./regulatory/regulatory-capital-ratios";
import * as riskWeightedAssets from "./regulatory/risk-weighted-assets";
import * as ffiecCallReportCrossref from "./regulatory/ffiec-call-report-crossref";
import * as subpart1400Disclosure from "./regulatory/subpart-1400-disclosure";
import * as aociOptOutDisclosure from "./regulatory/aoci-opt-out-disclosure";

export interface BankingFrameworkViolation {
  framework: string;
  violation: string;
  citation: string;
  remediation: string;
  message: string;
}

export interface BankingRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: BankingFrameworkViolation;
}

function frameworkViolationFromError(error: FrameworkViolationError): BankingFrameworkViolation {
  return {
    framework: error.framework,
    violation: error.violation,
    citation: error.citation,
    remediation: error.remediation,
    message: error.message,
  };
}

function wrapEmit(emitterId: string, emitterPath: string, fn: () => EmitterResult): EmitterResult {
  try {
    return fn();
  } catch (error) {
    if (error instanceof MissingDisclosureInputError) {
      return {
        emitterId,
        emitterPath,
        lines: [],
        status: "fail-closed",
        failureReason: error.message,
      };
    }
    if (error instanceof FrameworkViolationError) {
      throw error;
    }
    throw error;
  }
}

function runUSGAAPLane(input: ReturnType<typeof buildBankingEmitterInput>): EmitterResult[] {
  const b = input.banking;
  const results: EmitterResult[] = [];

  if (b.hasLoansHFI) {
    results.push(
      wrapEmit("cecl-loans-hfi", ceclLoansHfi.EMITTER_PATH, () =>
        ceclLoansHfi.emitCeclLoansHfi(input),
      ),
    );
    results.push(
      wrapEmit("loan-portfolio-segmentation", loanPortfolioSegmentation.EMITTER_PATH, () =>
        loanPortfolioSegmentation.emitLoanPortfolioSegmentation(input),
      ),
    );
    results.push(
      wrapEmit("npl-and-charge-offs", nplAndChargeOffs.EMITTER_PATH, () =>
        nplAndChargeOffs.emitNplAndChargeOffs(input),
      ),
    );
  }

  if (b.hasAFSDebtSecurities && (b.afsDebtUnrealizedLoss ?? 0) > 0) {
    results.push(
      wrapEmit("cecl-afs-debt", ceclAfsDebt.EMITTER_PATH, () =>
        ceclAfsDebt.emitCeclAfsDebt(input),
      ),
    );
  }

  if (b.hasHTMDebtSecurities) {
    results.push(
      wrapEmit("cecl-htm-debt", ceclHtmDebt.EMITTER_PATH, () =>
        ceclHtmDebt.emitCeclHtmDebt(input),
      ),
    );
  }

  if (b.obsCommitments > 0) {
    results.push(
      wrapEmit("cecl-obs-commitments", ceclObsCommitments.EMITTER_PATH, () =>
        ceclObsCommitments.emitCeclObsCommitments(input),
      ),
    );
  }

  if (hasInScopeCeclAssets(b)) {
    results.push(
      wrapEmit("allowance-rollforward", allowanceRollforward.EMITTER_PATH, () =>
        allowanceRollforward.emitAllowanceRollforward(input),
      ),
    );
  }

  const hp = b.hedgePortfolio;
  if ((hp?.cashFlowHedges ?? 0) > 0) {
    results.push(
      wrapEmit("hedge-cash-flow", hedgeCashFlow.EMITTER_PATH, () =>
        hedgeCashFlow.emitHedgeCashFlow(input),
      ),
    );
  }
  if ((hp?.fairValueHedges ?? 0) > 0) {
    results.push(
      wrapEmit("hedge-fair-value", hedgeFairValue.EMITTER_PATH, () =>
        hedgeFairValue.emitHedgeFairValue(input),
      ),
    );
  }
  if ((hp?.portfolioLayerHedges ?? 0) > 0) {
    results.push(
      wrapEmit("hedge-portfolio-layer", hedgePortfolioLayer.EMITTER_PATH, () =>
        hedgePortfolioLayer.emitHedgePortfolioLayer(input),
      ),
    );
  }

  results.push(
    wrapEmit("investment-classification", investmentClassification.EMITTER_PATH, () =>
      investmentClassification.emitInvestmentClassification(input),
    ),
  );

  if (b.htmSaleDuringPeriod) {
    results.push(
      wrapEmit("htm-taint-disclosure", htmTaintDisclosure.EMITTER_PATH, () =>
        htmTaintDisclosure.emitHtmTaintDisclosure(input),
      ),
    );
  }

  return results;
}

function runIFRS9Lane(input: ReturnType<typeof buildBankingEmitterInput>): EmitterResult[] {
  if (!hasIfrs9Input(input.banking)) {
    return [];
  }
  const results: EmitterResult[] = [
    wrapEmit("ifrs9-staged-ecl", ifrs9StagedEcl.EMITTER_PATH, () =>
      ifrs9StagedEcl.emitIfrs9StagedEcl(input),
    ),
    wrapEmit("ifrs9-sppi-test", ifrs9SppiTest.EMITTER_PATH, () =>
      ifrs9SppiTest.emitIfrs9SppiTest(input),
    ),
  ];
  if (input.banking.hedgePortfolio) {
    results.push(
      wrapEmit("ifrs9-hedge-accounting", ifrs9HedgeAccounting.EMITTER_PATH, () =>
        ifrs9HedgeAccounting.emitIfrs9HedgeAccounting(input),
      ),
    );
  }
  return results;
}

function runRegulatoryLane(input: ReturnType<typeof buildBankingEmitterInput>): EmitterResult[] {
  const b = input.banking;
  const results: EmitterResult[] = [
    wrapEmit("regulatory-capital-ratios", regulatoryCapitalRatios.EMITTER_PATH, () =>
      regulatoryCapitalRatios.emitRegulatoryCapitalRatios(input),
    ),
    wrapEmit("risk-weighted-assets", riskWeightedAssets.EMITTER_PATH, () =>
      riskWeightedAssets.emitRiskWeightedAssets(input),
    ),
  ];

  if (b.callReportForm && ["031", "041", "051"].includes(b.callReportForm)) {
    results.push(
      wrapEmit("ffiec-call-report-crossref", ffiecCallReportCrossref.EMITTER_PATH, () =>
        ffiecCallReportCrossref.emitFfiecCallReportCrossref(input),
      ),
    );
  }

  if (b.secFilerFlag) {
    results.push(
      wrapEmit("subpart-1400-disclosure", subpart1400Disclosure.EMITTER_PATH, () =>
        subpart1400Disclosure.emitSubpart1400Disclosure(input),
      ),
    );
  }

  if (b.aociOptOutElection) {
    results.push(
      wrapEmit("aoci-opt-out-disclosure", aociOptOutDisclosure.EMITTER_PATH, () =>
        aociOptOutDisclosure.emitAociOptOutDisclosure(input),
      ),
    );
  }

  return results;
}

function assertHtmTaintFiredIfRequired(
  b: ReturnType<typeof buildBankingEmitterInput>["banking"],
  results: EmitterResult[],
): void {
  if (!b.htmSaleDuringPeriod || b.htmPermittedExceptionFlag) {
    return;
  }
  const fired = results.some(
    (r) => r.emitterId === "htm-taint-disclosure" && r.status === "satisfied",
  );
  if (!fired) {
    throw new FrameworkViolationError(
      "ASC_320",
      "HTM taint without permitted exception disclosure",
      "ASC 320-10-25-14",
      "HTM sale during period requires htm-taint-disclosure unless permitted exception applies.",
    );
  }
}

export function runBankingRouter(extracted: ExtractedFiling): BankingRouterOutput {
  try {
    validateBankingForbidden(extracted);
    const input = buildBankingEmitterInput(extracted);
    const b = input.banking;
    const results: EmitterResult[] = [];

    if (isUsGaapBanking(b)) {
      results.push(...runUSGAAPLane(input));
    }

    if (isIfrsBanking(b)) {
      results.push(...runIFRS9Lane(input));
    }

    results.push(...runRegulatoryLane(input));

    assertHtmTaintFiredIfRequired(b, results);

    const augmentedNarratives = [
      ...extracted.narrativeSnippets,
      ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
    ];

    return { framework: b.gaapBasis as ExtractedFiling["framework"], results, augmentedNarratives };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        framework: (extracted.banking?.gaapBasis ?? "unknown") as ExtractedFiling["framework"],
        results: [],
        augmentedNarratives: extracted.narrativeSnippets,
        frameworkViolation: frameworkViolationFromError(error),
      };
    }
    throw error;
  }
}

export function emitterSatisfiesAssertion(
  results: EmitterResult[],
  assertionId: string,
): { satisfied: boolean; emitterPath?: string; citation?: string } {
  for (const result of results) {
    if (result.status !== "satisfied") continue;
    const line = result.lines.find((entry) => entry.assertionId === assertionId);
    if (line) {
      return {
        satisfied: true,
        emitterPath: result.emitterPath,
        citation: citationResolved(line.citation),
      };
    }
  }
  return { satisfied: false };
}

export function withRouterNarratives(extracted: ExtractedFiling): ExtractedFiling {
  const router = runBankingRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
