import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { MissingDisclosureInputError } from "./errors";
import { assertRetailIfrsSupported, buildRetailEmitterInput } from "./types";
import * as ifrsInventory from "./ifrs/inventoryMethodDeclaration";
import {
  buildRetailLeaseEmitterInput,
  hasAnyLeaseAsc842Input,
  hasLeaseCostBreakdownInput,
  hasLeaseMaturityInput,
  hasLeaseWeightedAveragesInput,
} from "../lanes/retail/types";
import * as leaseCost from "../lanes/retail/emitters/leaseCostBreakdown";
import * as leaseWeighted from "../lanes/retail/emitters/leaseWeightedAverages";
import * as leaseMaturity from "../lanes/retail/emitters/leaseMaturityReconciliation";

export interface RetailFrameworkViolation {
  framework: string;
  violation: string;
  citation: string;
  remediation: string;
  message: string;
}

export interface RetailRouterOutput {
  frameworkLane: ExtractedFiling["framework"];
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: RetailFrameworkViolation;
}

function wrapEmit(emitterId: string, emitterPath: string, fn: () => EmitterResult): EmitterResult {
  try {
    return fn();
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      throw error;
    }
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

function runRetailIfrsLane(extracted: ExtractedFiling): RetailRouterOutput {
  if (hasAnyLeaseAsc842Input(extracted)) {
    return {
      frameworkLane: extracted.framework,
      results: [],
      augmentedNarratives: extracted.narrativeSnippets,
      frameworkViolation: {
        framework: "IFRS",
        violation: "US GAAP ASC 842 lease emitters not applicable under IFRS 16 lane",
        citation: "IFRS 16",
        remediation: "Route lease-obligations to IFRS 16 right-of-use emitters (C7a-10).",
        message: "IFRS retail filing cannot use US GAAP ASC 842 lease emitters.",
      },
    };
  }

  assertRetailIfrsSupported(extracted);
  const input = buildRetailEmitterInput(extracted);

  try {
    const results = [
      wrapEmit("inventory-method-declaration", ifrsInventory.EMITTER_PATH, () =>
        ifrsInventory.emitInventoryMethodDeclaration(input),
      ),
    ];
    const augmentedNarratives = [
      ...extracted.narrativeSnippets,
      ...results.flatMap((result) =>
        result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
      ),
    ];
    return { frameworkLane: extracted.framework, results, augmentedNarratives };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        frameworkLane: extracted.framework,
        results: [],
        augmentedNarratives: extracted.narrativeSnippets,
        frameworkViolation: {
          framework: error.framework,
          violation: error.violation,
          citation: error.citation,
          remediation: error.remediation,
          message: error.message,
        },
      };
    }
    throw error;
  }
}

function runRetailUsgaapLane(extracted: ExtractedFiling): RetailRouterOutput {
  const input = buildRetailLeaseEmitterInput(extracted);
  const results: EmitterResult[] = [];

  try {
    if (hasLeaseCostBreakdownInput(extracted)) {
      results.push(
        wrapEmit("lease-cost-breakdown", leaseCost.EMITTER_PATH, () =>
          leaseCost.emitLeaseCostBreakdown(input),
        ),
      );
    }
    if (hasLeaseWeightedAveragesInput(extracted)) {
      results.push(
        wrapEmit("lease-weighted-averages", leaseWeighted.EMITTER_PATH, () =>
          leaseWeighted.emitLeaseWeightedAverages(input),
        ),
      );
    }
    if (hasLeaseMaturityInput(extracted)) {
      results.push(
        wrapEmit("lease-maturity-reconciliation", leaseMaturity.EMITTER_PATH, () =>
          leaseMaturity.emitLeaseMaturityReconciliation(input),
        ),
      );
    }

    const augmentedNarratives = [
      ...extracted.narrativeSnippets,
      ...results.flatMap((result) =>
        result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
      ),
    ];
    return { frameworkLane: extracted.framework, results, augmentedNarratives };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        frameworkLane: extracted.framework,
        results: [],
        augmentedNarratives: extracted.narrativeSnippets,
        frameworkViolation: {
          framework: error.framework,
          violation: error.violation,
          citation: error.citation,
          remediation: error.remediation,
          message: error.message,
        },
      };
    }
    throw error;
  }
}

export function runRetailRouter(extracted: ExtractedFiling): RetailRouterOutput {
  if (extracted.framework === "ifrs") {
    return runRetailIfrsLane(extracted);
  }
  if (extracted.framework === "us-gaap") {
    return runRetailUsgaapLane(extracted);
  }
  return {
    frameworkLane: extracted.framework,
    results: [],
    augmentedNarratives: extracted.narrativeSnippets,
  };
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
  const router = runRetailRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}

export function ifrsRetailEmitterOutputText(extracted: ExtractedFiling): string {
  const router = runRetailRouter({ ...extracted, framework: "ifrs", rawFrameworkSignals: ["ifrs-full"] });
  return router.results
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function usgaapRetailLeaseOutputText(extracted: ExtractedFiling): string {
  const router = runRetailRouter({ ...extracted, framework: "us-gaap", rawFrameworkSignals: ["us-gaap"] });
  return router.results
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
