import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { assertGovconFrameworkSupported, buildGovconEmitterInput } from "./types";
import * as usContractMix from "./usgaap/contractTypeMixDisclosure";
import * as usCas from "./usgaap/dcaaCASComplianceDisclosure";
import * as usBacklog from "./usgaap/backlogFundedVsUnfunded";
import * as usFar from "./usgaap/costAllowabilityFAR";
import * as usRates from "./usgaap/indirectRateStructure";
import * as ifrsContractMix from "./ifrs/contractTypeMixDisclosure";
import * as ifrsBacklog from "./ifrs/backlogDisclosure";

export interface GovconRouterOutput {
  frameworkLane: ExtractedFiling["framework"];
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

function runUSGAAPLane(input: ReturnType<typeof buildGovconEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("contract-type-mix-disclosure", usContractMix.EMITTER_PATH, () =>
      usContractMix.emitContractTypeMixDisclosure(input),
    ),
    wrapEmit("dcaa-cas-compliance-disclosure", usCas.EMITTER_PATH, () =>
      usCas.emitDcaaCASComplianceDisclosure(input),
    ),
    wrapEmit("backlog-funded-vs-unfunded", usBacklog.EMITTER_PATH, () =>
      usBacklog.emitBacklogFundedVsUnfunded(input),
    ),
    wrapEmit("cost-allowability-far", usFar.EMITTER_PATH, () => usFar.emitCostAllowabilityFAR(input)),
    wrapEmit("indirect-rate-structure", usRates.EMITTER_PATH, () => usRates.emitIndirectRateStructure(input)),
  ];
}

function runIFRSLane(input: ReturnType<typeof buildGovconEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("contract-type-mix-disclosure", ifrsContractMix.EMITTER_PATH, () =>
      ifrsContractMix.emitContractTypeMixDisclosure(input),
    ),
    wrapEmit("backlog-disclosure", ifrsBacklog.EMITTER_PATH, () => ifrsBacklog.emitBacklogDisclosure(input)),
  ];
}

export function runGovconRouter(extracted: ExtractedFiling): GovconRouterOutput {
  assertGovconFrameworkSupported(extracted);
  const input = buildGovconEmitterInput(extracted);
  const results = extracted.framework === "ifrs" ? runIFRSLane(input) : runUSGAAPLane(input);
  const augmentedNarratives = [
    ...extracted.narrativeSnippets,
    ...results.flatMap((result) =>
      result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
    ),
  ];
  return { frameworkLane: extracted.framework, results, augmentedNarratives };
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
  const router = runGovconRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function govconLaneOutputText(extracted: ExtractedFiling, lane: "us_gaap" | "ifrs"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ifrs" ? "ifrs" : "us-gaap",
    rawFrameworkSignals: lane === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
  const router = runGovconRouter(clone);
  const segment = lane === "ifrs" ? "/govcon/ifrs/" : "/govcon/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
