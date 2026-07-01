import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { assertSaasFrameworkSupported, buildSaasEmitterInput } from "./types";
import * as usBalances from "./usgaap/contractAssetLiabilitySplit";
import * as usDisagg from "./usgaap/revenueDisaggregation";
import * as usCost from "./usgaap/costToObtainContract";
import * as usTpa from "./usgaap/transactionPriceAllocation";
import * as usRpo from "./usgaap/remainingPerformanceObligation";
import * as usVc from "./usgaap/variableConsiderationConstraint";
import * as usPva from "./usgaap/principalVsAgent";
import * as ifrsBalances from "./ifrs/contractAssetLiabilitySplit";
import * as ifrsDisagg from "./ifrs/revenueDisaggregation";
import * as ifrsCost from "./ifrs/costToObtainContract";
import * as ifrsTpa from "./ifrs/transactionPriceAllocation";
import * as ifrsRpo from "./ifrs/remainingPerformanceObligation";
import * as ifrsVc from "./ifrs/variableConsiderationConstraint";
import * as ifrsPva from "./ifrs/principalVsAgent";

export interface SaasRouterOutput {
  framework: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
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
    throw error;
  }
}

function runUSGAAPLane(input: ReturnType<typeof buildSaasEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("contract-asset-liability-split", usBalances.EMITTER_PATH, () =>
      usBalances.emitContractAssetLiabilitySplit(input),
    ),
    wrapEmit("revenue-disaggregation", usDisagg.EMITTER_PATH, () =>
      usDisagg.emitRevenueDisaggregation(input),
    ),
    wrapEmit("cost-to-obtain-contract", usCost.EMITTER_PATH, () => usCost.emitCostToObtainContract(input)),
    wrapEmit("transaction-price-allocation", usTpa.EMITTER_PATH, () =>
      usTpa.emitTransactionPriceAllocation(input),
    ),
    wrapEmit("remaining-performance-obligation", usRpo.EMITTER_PATH, () =>
      usRpo.emitRemainingPerformanceObligation(input),
    ),
    wrapEmit("variable-consideration-constraint", usVc.EMITTER_PATH, () =>
      usVc.emitVariableConsiderationConstraint(input),
    ),
    wrapEmit("principal-vs-agent", usPva.EMITTER_PATH, () => usPva.emitPrincipalVsAgent(input)),
  ];
}

function runIFRSLane(input: ReturnType<typeof buildSaasEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("contract-asset-liability-split", ifrsBalances.EMITTER_PATH, () =>
      ifrsBalances.emitContractAssetLiabilitySplit(input),
    ),
    wrapEmit("revenue-disaggregation", ifrsDisagg.EMITTER_PATH, () =>
      ifrsDisagg.emitRevenueDisaggregation(input),
    ),
    wrapEmit("cost-to-obtain-contract", ifrsCost.EMITTER_PATH, () =>
      ifrsCost.emitCostToObtainContract(input),
    ),
    wrapEmit("transaction-price-allocation", ifrsTpa.EMITTER_PATH, () =>
      ifrsTpa.emitTransactionPriceAllocation(input),
    ),
    wrapEmit("remaining-performance-obligation", ifrsRpo.EMITTER_PATH, () =>
      ifrsRpo.emitRemainingPerformanceObligation(input),
    ),
    wrapEmit("variable-consideration-constraint", ifrsVc.EMITTER_PATH, () =>
      ifrsVc.emitVariableConsiderationConstraint(input),
    ),
    wrapEmit("principal-vs-agent", ifrsPva.EMITTER_PATH, () => ifrsPva.emitPrincipalVsAgent(input)),
  ];
}

export function runSaasRouter(extracted: ExtractedFiling): SaasRouterOutput {
  assertSaasFrameworkSupported(extracted);
  const input = buildSaasEmitterInput(extracted);
  const results = extracted.framework === "ifrs" ? runIFRSLane(input) : runUSGAAPLane(input);
  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((result) =>
      result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
    ),
  ];
  return { framework: extracted.framework, results, augmentedNarratives };
}

export function emitterSatisfiesAssertion(
  results: EmitterResult[],
  assertionId: string,
): { satisfied: boolean; emitterPath?: string; citation?: string } {
  for (const result of results) {
    if (result.status !== "satisfied") {
      continue;
    }
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
  const router = runSaasRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function saasLaneOutputText(extracted: ExtractedFiling, lane: "us_gaap" | "ifrs"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ifrs" ? "ifrs" : "us-gaap",
    rawFrameworkSignals: lane === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
  const router = runSaasRouter(clone);
  const segment = lane === "ifrs" ? "/saas/ifrs/" : "/saas/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
