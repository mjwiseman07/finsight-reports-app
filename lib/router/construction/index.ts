import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { buildConstructionEmitterInput, hasPostCompletionInput, type OutputMeasureMethod } from "./types";
import * as usPoc from "./usgaap/pocMethodDisclosure";
import * as usBalances from "./usgaap/contractBalanceRollforward";
import * as usCost from "./usgaap/costToCostInputMeasure";
import * as usDisagg from "./usgaap/revenueDisaggregation";
import * as usUnits from "./usgaap/unitsOfDeliveryOutputMeasure";
import * as usMilestone from "./usgaap/milestoneOutputMeasure";
import * as usPostCompletion from "./usgaap/postCompletionAdjustments";
import * as ifrsPoc from "./ifrs/pocMethodDisclosure";
import * as ifrsBalances from "./ifrs/contractBalanceRollforward";
import * as ifrsInput from "./ifrs/inputMeasureJustification";
import * as ifrsDisagg from "./ifrs/revenueDisaggregation";
import * as ifrsUnits from "./ifrs/unitsOfDeliveryOutputMeasure";
import * as ifrsMilestone from "./ifrs/milestoneOutputMeasure";
import * as ifrsPostCompletion from "./ifrs/postCompletionAdjustments";

export interface ConstructionRouterOutput {
  framework: RouterFramework;
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: FrameworkViolationError;
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

function runUSGAAPLane(
  input: ReturnType<typeof buildConstructionEmitterInput>,
  method: OutputMeasureMethod,
): EmitterResult[] {
  const results: EmitterResult[] = [
    wrapEmit("contract-balances-rollforward", usBalances.EMITTER_PATH, () =>
      usBalances.emitContractBalanceRollforward(input),
    ),
    wrapEmit("revenue-disaggregation", usDisagg.EMITTER_PATH, () =>
      usDisagg.emitRevenueDisaggregation(input),
    ),
  ];

  if (method === "units-of-delivery") {
    results.unshift(
      wrapEmit("units-of-delivery-output-measure", usUnits.EMITTER_PATH, () =>
        usUnits.emitUnitsOfDeliveryOutputMeasure(input),
      ),
    );
  } else if (method === "milestones") {
    results.unshift(
      wrapEmit("milestone-output-measure", usMilestone.EMITTER_PATH, () =>
        usMilestone.emitMilestoneOutputMeasure(input),
      ),
    );
  } else {
    results.unshift(
      wrapEmit("poc-method-declared", usPoc.EMITTER_PATH, () => usPoc.emitPocMethodDisclosure(input)),
      wrapEmit("cost-to-cost-ratio", usCost.EMITTER_PATH, () => usCost.emitCostToCostInputMeasure(input)),
    );
  }

  if (hasPostCompletionInput(input.extracted)) {
    results.push(
      wrapEmit("post-completion-adjustments", usPostCompletion.EMITTER_PATH, () =>
        usPostCompletion.emitPostCompletionAdjustments(input),
      ),
    );
  }

  return results;
}

function runIFRSLane(
  input: ReturnType<typeof buildConstructionEmitterInput>,
  method: OutputMeasureMethod,
): EmitterResult[] {
  const results: EmitterResult[] = [
    wrapEmit("contract-balances-rollforward", ifrsBalances.EMITTER_PATH, () =>
      ifrsBalances.emitContractBalanceRollforward(input),
    ),
    wrapEmit("revenue-disaggregation", ifrsDisagg.EMITTER_PATH, () =>
      ifrsDisagg.emitRevenueDisaggregation(input),
    ),
  ];

  if (method === "units-of-delivery") {
    results.unshift(
      wrapEmit("units-of-delivery-output-measure", ifrsUnits.EMITTER_PATH, () =>
        ifrsUnits.emitUnitsOfDeliveryOutputMeasure(input),
      ),
    );
  } else if (method === "milestones") {
    results.unshift(
      wrapEmit("milestone-output-measure", ifrsMilestone.EMITTER_PATH, () =>
        ifrsMilestone.emitMilestoneOutputMeasure(input),
      ),
    );
  } else {
    results.unshift(
      wrapEmit("poc-method-declared", ifrsPoc.EMITTER_PATH, () => ifrsPoc.emitPocMethodDisclosure(input)),
      wrapEmit("cost-to-cost-ratio", ifrsInput.EMITTER_PATH, () => ifrsInput.emitInputMeasureJustification(input)),
    );
  }

  if (hasPostCompletionInput(input.extracted)) {
    results.push(
      wrapEmit("post-completion-adjustments", ifrsPostCompletion.EMITTER_PATH, () =>
        ifrsPostCompletion.emitPostCompletionAdjustments(input),
      ),
    );
  }

  return results;
}

export function runConstructionRouter(extracted: ExtractedFiling): ConstructionRouterOutput {
  try {
    const input = buildConstructionEmitterInput(extracted);
    const results =
      extracted.framework === "ifrs"
        ? runIFRSLane(input, input.outputMeasureMethod)
        : runUSGAAPLane(input, input.outputMeasureMethod);

    const augmentedNarratives = [
      ...extracted.narrativeSnippets,
      ...results.flatMap((result) =>
        result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
      ),
    ];

    return {
      framework: extracted.framework,
      results,
      augmentedNarratives,
    };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        framework: extracted.framework,
        results: [],
        augmentedNarratives: extracted.narrativeSnippets,
        frameworkViolation: error,
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
  const router = runConstructionRouter(extracted);
  return {
    ...extracted,
    narrativeSnippets: router.augmentedNarratives,
  };
}

export function constructionLaneOutputText(extracted: ExtractedFiling, lane: "us-gaap" | "ifrs"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ifrs" ? "ifrs" : "us-gaap",
    rawFrameworkSignals: lane === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
  const router = runConstructionRouter(clone);
  const segment = lane === "ifrs" ? "/construction/ifrs/" : "/construction/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
