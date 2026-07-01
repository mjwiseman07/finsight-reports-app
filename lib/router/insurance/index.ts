import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { validateInsuranceForbidden } from "./forbidden";
import {
  buildInsuranceEmitterInput,
  isIfrsInsurance,
  isUsGaapInsurance,
  vfaFullyQualified,
} from "./types";
import * as usLossReserves from "./usgaap/lossReservesAndIBNR";
import * as usTriangle from "./usgaap/claimsDevelopmentTriangle";
import * as usCecl from "./usgaap/premiumsReceivableCECL";
import * as usReinsurance from "./usgaap/reinsuranceRecoverable";
import * as usLfpb from "./usgaap/liabilityForFuturePolicyBenefits";
import * as usDac from "./usgaap/dacAmortization";
import * as usMrb from "./usgaap/marketRiskBenefits";
import * as usEmbeddedVa from "./usgaap/embeddedDerivativesVA";
import * as ifrsBbaInit from "./ifrs/bbaInitialMeasurement";
import * as ifrsBbaSub from "./ifrs/bbaSubsequentMeasurement";
import * as ifrsPaa from "./ifrs/paaMeasurement";
import * as ifrsVfa from "./ifrs/vfaMeasurement";
import * as ifrsRa from "./ifrs/riskAdjustment";
import * as ifrsBoundary from "./ifrs/contractBoundaryDisclosure";
import * as sapRecon from "./sap/statutoryReconciliation";
import * as sapRbc from "./sap/rbcRatioDisclosure";

export interface InsuranceFrameworkViolation {
  framework: string;
  violation: string;
  citation: string;
  remediation: string;
  message: string;
}

export interface InsuranceRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: InsuranceFrameworkViolation;
}

function frameworkViolationFromError(error: FrameworkViolationError): InsuranceFrameworkViolation {
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

function runUSGAAPLane(input: ReturnType<typeof buildInsuranceEmitterInput>): EmitterResult[] {
  const ins = input.insurance;
  const results: EmitterResult[] = [];

  if (ins.hasShortDurationContracts) {
    results.push(
      wrapEmit("loss-reserves-and-ibnr", usLossReserves.EMITTER_PATH, () =>
        usLossReserves.emitLossReservesAndIBNR(input),
      ),
    );
    results.push(
      wrapEmit("claims-development-triangle", usTriangle.EMITTER_PATH, () =>
        usTriangle.emitClaimsDevelopmentTriangle(input),
      ),
    );
  }

  if (ins.premiumsReceivable > 0) {
    results.push(
      wrapEmit("premiums-receivable-cecl", usCecl.EMITTER_PATH, () =>
        usCecl.emitPremiumsReceivableCECL(input),
      ),
    );
  }

  if (ins.cessionPercentage > 0) {
    results.push(
      wrapEmit("reinsurance-recoverable", usReinsurance.EMITTER_PATH, () =>
        usReinsurance.emitReinsuranceRecoverable(input),
      ),
    );
  }

  if (ins.hasLongDurationContracts) {
    results.push(
      wrapEmit("liability-for-future-policy-benefits", usLfpb.EMITTER_PATH, () =>
        usLfpb.emitLiabilityForFuturePolicyBenefits(input),
      ),
    );
    results.push(
      wrapEmit("dac-amortization", usDac.EMITTER_PATH, () => usDac.emitDacAmortization(input)),
    );

    if (ins.hasMarketRiskFeature) {
      const mrbResult = usMrb.emitMarketRiskBenefits(input);
      results.push(mrbResult);
      if (ins.hasVariableAnnuityProducts && !mrbResult.mrbApplicable) {
        results.push(
          wrapEmit("embedded-derivatives-va", usEmbeddedVa.EMITTER_PATH, () =>
            usEmbeddedVa.emitEmbeddedDerivativesVA(input),
          ),
        );
      }
    } else if (ins.hasVariableAnnuityProducts) {
      results.push(
        wrapEmit("embedded-derivatives-va", usEmbeddedVa.EMITTER_PATH, () =>
          usEmbeddedVa.emitEmbeddedDerivativesVA(input),
        ),
      );
    }
  }

  return results;
}

function runIFRS17Lane(input: ReturnType<typeof buildInsuranceEmitterInput>): EmitterResult[] {
  const ifrs17 = input.insurance.ifrs17!;
  const results: EmitterResult[] = [
    wrapEmit("risk-adjustment", ifrsRa.EMITTER_PATH, () => ifrsRa.emitRiskAdjustment(input)),
    wrapEmit("contract-boundary-disclosure", ifrsBoundary.EMITTER_PATH, () =>
      ifrsBoundary.emitContractBoundaryDisclosure(input),
    ),
  ];

  if (ifrs17.paaEligible) {
    results.push(
      wrapEmit("paa-measurement", ifrsPaa.EMITTER_PATH, () => ifrsPaa.emitPaaMeasurement(input)),
    );
    return results;
  }

  if (ifrs17.hasDirectParticipatingFeatures && vfaFullyQualified(input.insurance)) {
    results.push(
      wrapEmit("vfa-measurement", ifrsVfa.EMITTER_PATH, () => ifrsVfa.emitVfaMeasurement(input)),
    );
    return results;
  }

  results.push(
    wrapEmit("bba-initial-measurement", ifrsBbaInit.EMITTER_PATH, () =>
      ifrsBbaInit.emitBbaInitialMeasurement(input),
    ),
  );
  results.push(
    wrapEmit("bba-subsequent-measurement", ifrsBbaSub.EMITTER_PATH, () =>
      ifrsBbaSub.emitBbaSubsequentMeasurement(input),
    ),
  );
  return results;
}

function runSAPLane(input: ReturnType<typeof buildInsuranceEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("statutory-reconciliation", sapRecon.EMITTER_PATH, () =>
      sapRecon.emitStatutoryReconciliation(input),
    ),
    wrapEmit("rbc-ratio-disclosure", sapRbc.EMITTER_PATH, () =>
      sapRbc.emitRbcRatioDisclosure(input),
    ),
  ];
}

export function runInsuranceRouter(extracted: ExtractedFiling): InsuranceRouterOutput {
  try {
    validateInsuranceForbidden(extracted);
    const input = buildInsuranceEmitterInput(extracted);
    const ins = input.insurance;
    const results: EmitterResult[] = [];

    if (isUsGaapInsurance(ins)) {
      results.push(...runUSGAAPLane(input));
    }

    if (isIfrsInsurance(ins)) {
      results.push(...runIFRS17Lane(input));
    }

    if (ins.naicFilerFlag && isUsGaapInsurance(ins)) {
      results.push(...runSAPLane(input));
    }

    const augmentedNarratives = [
      ...extracted.narrativeSnippets,
      ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
    ];

    return { framework: ins.gaapBasis as ExtractedFiling["framework"], results, augmentedNarratives };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        framework: (extracted.insurance?.gaapBasis ?? "unknown") as ExtractedFiling["framework"],
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
  const router = runInsuranceRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
