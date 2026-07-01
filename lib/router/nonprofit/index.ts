import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { FrameworkUnsupportedError } from "./errors";
import { buildNonprofitEmitterInput, resolveNonprofitFrameworkLane } from "./types";
import * as usFunctional from "./usgaap/functionalExpenseAllocation";
import * as usNatural from "./usgaap/naturalExpenseDisclosure";
import * as usAllocation from "./usgaap/allocationMethodologyDisclosure";
import * as ipsasFunctional from "./ipsas/functionalExpenseDisclosure";
import * as ipsasService from "./ipsas/serviceCostingDisclosure";
import { MissingDisclosureInputError } from "./errors";

export interface NonprofitRouterDeferred {
  framework: "ifrs-for-smes";
  status: "deferred";
  reason: string;
}

export interface NonprofitRouterOutput {
  framework: RouterFramework;
  results: EmitterResult[];
  deferred?: NonprofitRouterDeferred;
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

function runUSGAAPLane(input: ReturnType<typeof buildNonprofitEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("functional-expense-allocation", usFunctional.EMITTER_PATH, () =>
      usFunctional.emitFunctionalExpenseAllocation(input),
    ),
    wrapEmit("natural-expense-disclosure", usNatural.EMITTER_PATH, () =>
      usNatural.emitNaturalExpenseDisclosure(input),
    ),
    wrapEmit("allocation-methodology-disclosure", usAllocation.EMITTER_PATH, () =>
      usAllocation.emitAllocationMethodologyDisclosure(input),
    ),
  ];
}

function runIPSASLane(input: ReturnType<typeof buildNonprofitEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("functional-expense-disclosure", ipsasFunctional.EMITTER_PATH, () =>
      ipsasFunctional.emitFunctionalExpenseDisclosure(input),
    ),
    wrapEmit("service-costing-disclosure", ipsasService.EMITTER_PATH, () =>
      ipsasService.emitServiceCostingDisclosure(input),
    ),
  ];
}

export function runNonprofitRouter(extracted: ExtractedFiling): NonprofitRouterOutput {
  const lane = resolveNonprofitFrameworkLane(extracted);
  const input = buildNonprofitEmitterInput(extracted);

  if (lane === "ifrs-for-smes") {
    return {
      framework: lane,
      results: [],
      deferred: {
        framework: "ifrs-for-smes",
        status: "deferred",
        reason: "NPO IFRS for SMEs lane not yet implemented; tracked as remainder",
      },
      augmentedNarratives: extracted.narrativeSnippets,
    };
  }

  const results = lane === "ipsas" ? runIPSASLane(input) : runUSGAAPLane(input);
  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((result) =>
      result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
    ),
  ];

  return { framework: lane, results, augmentedNarratives };
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
  const router = runNonprofitRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function nonprofitLaneOutputText(extracted: ExtractedFiling, lane: "us-gaap" | "ipsas"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ipsas" ? "ipsas" : "us-gaap",
    rawFrameworkSignals: lane === "ipsas" ? ["ipsas"] : ["us-gaap"],
  };
  const router = runNonprofitRouter(clone);
  const segment = lane === "ipsas" ? "/nonprofit/ipsas/" : "/nonprofit/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function assertFrameworkSupported(extracted: ExtractedFiling): void {
  try {
    resolveNonprofitFrameworkLane(extracted);
  } catch {
    throw new FrameworkUnsupportedError(`NPO framework not supported: ${extracted.framework}`);
  }
}
