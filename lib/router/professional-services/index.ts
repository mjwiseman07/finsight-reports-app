import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { MissingDisclosureInputError } from "./errors";
import { assertPsFrameworkSupported, buildPsEmitterInput } from "./types";
import * as usUnbilled from "./usgaap/unbilledReceivablesDisclosure";
import * as usPrincipal from "./usgaap/principalVsAgentDisclosure";
import * as usFee from "./usgaap/feeStructureDisclosure";
import * as ifrsUnbilled from "./ifrs/unbilledReceivablesDisclosure";
import * as ifrsPrincipal from "./ifrs/principalVsAgentDisclosure";

export interface PsRouterOutput {
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

function runUSGAAPLane(input: ReturnType<typeof buildPsEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("unbilled-receivables-disclosure", usUnbilled.EMITTER_PATH, () =>
      usUnbilled.emitUnbilledReceivablesDisclosure(input),
    ),
    wrapEmit("principal-vs-agent-disclosure", usPrincipal.EMITTER_PATH, () =>
      usPrincipal.emitPrincipalVsAgentDisclosure(input),
    ),
    wrapEmit("fee-structure-disclosure", usFee.EMITTER_PATH, () => usFee.emitFeeStructureDisclosure(input)),
  ];
}

function runIFRSLane(input: ReturnType<typeof buildPsEmitterInput>): EmitterResult[] {
  return [
    wrapEmit("unbilled-receivables-disclosure", ifrsUnbilled.EMITTER_PATH, () =>
      ifrsUnbilled.emitUnbilledReceivablesDisclosure(input),
    ),
    wrapEmit("principal-vs-agent-disclosure", ifrsPrincipal.EMITTER_PATH, () =>
      ifrsPrincipal.emitPrincipalVsAgentDisclosure(input),
    ),
  ];
}

export function runProfessionalServicesRouter(extracted: ExtractedFiling): PsRouterOutput {
  assertPsFrameworkSupported(extracted);
  const input = buildPsEmitterInput(extracted);
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
  const router = runProfessionalServicesRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function psLaneOutputText(extracted: ExtractedFiling, lane: "us_gaap" | "ifrs"): string {
  const clone: ExtractedFiling = {
    ...extracted,
    framework: lane === "ifrs" ? "ifrs" : "us-gaap",
    rawFrameworkSignals: lane === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
  const router = runProfessionalServicesRouter(clone);
  const segment = lane === "ifrs" ? "/professional-services/ifrs/" : "/professional-services/usgaap/";
  return router.results
    .filter((result) => result.emitterPath.includes(segment) && result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
