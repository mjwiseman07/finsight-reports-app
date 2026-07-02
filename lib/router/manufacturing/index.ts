import type { ExtractedFiling, RouterFramework } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import {
  hasAnyAsc330InventoryInput,
  hasAnyIas2InventoryInput,
  hasCogmRollforwardAsc330Input,
  hasInventoryDecompositionAsc330Input,
  hasInventoryDecompositionIas2Input,
  buildIas2EmitterInput,
  buildUsgaapAsc330EmitterInput,
} from "../lanes/manufacturing/types";
import * as usInventory from "../lanes/manufacturing/emitters/inventoryDecomposition";
import * as usCogm from "../lanes/manufacturing/emitters/cogmRollforward";
import * as ifrsInventory from "../lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2";

export interface ManufacturingFrameworkViolation {
  framework: string;
  violation: string;
  citation: string;
  remediation: string;
  message: string;
}

export interface ManufacturingRouterOutput {
  framework: RouterFramework;
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: ManufacturingFrameworkViolation;
}

function frameworkViolationFromError(error: FrameworkViolationError): ManufacturingFrameworkViolation {
  return {
    framework: error.framework,
    violation: error.violation,
    citation: error.citation,
    remediation: error.remediation,
    message: error.message,
  };
}

function runUsgaapInventoryLane(extracted: ExtractedFiling): EmitterResult[] {
  const input = buildUsgaapAsc330EmitterInput(extracted);
  const results: EmitterResult[] = [];
  if (hasInventoryDecompositionAsc330Input(extracted)) {
    results.push(usInventory.emitInventoryDecomposition(input));
  }
  if (hasCogmRollforwardAsc330Input(extracted)) {
    results.push(usCogm.emitCogmRollforward(input));
  }
  return results;
}

function runIfrsInventoryLane(extracted: ExtractedFiling): EmitterResult[] {
  const input = buildIas2EmitterInput(extracted);
  const results: EmitterResult[] = [];
  if (hasInventoryDecompositionIas2Input(extracted)) {
    results.push(ifrsInventory.emitInventoryDecompositionIAS2(input));
  }
  return results;
}

export function runManufacturingRouter(extracted: ExtractedFiling): ManufacturingRouterOutput {
  try {
    if (extracted.framework === "ifrs") {
      if (hasAnyAsc330InventoryInput(extracted)) {
        return {
          framework: extracted.framework,
          results: [],
          augmentedNarratives: extracted.narrativeSnippets,
          frameworkViolation: {
            framework: "IAS2_IFRS",
            violation: "US GAAP ASC 330 inventory inputs not applicable under IFRS lane",
            citation: "IAS 2",
            remediation: "Use manufacturing_inventory.ias2 structured inputs.",
            message: "IFRS manufacturing filing cannot use ASC 330 inventory emitters.",
          },
        };
      }
      const results = hasAnyIas2InventoryInput(extracted) ? runIfrsInventoryLane(extracted) : [];
      const augmentedNarratives = [
        ...extracted.narrativeSnippets,
        ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
      ];
      return { framework: extracted.framework, results, augmentedNarratives };
    }

    if (extracted.framework === "us-gaap") {
      if (hasAnyIas2InventoryInput(extracted)) {
        return {
          framework: extracted.framework,
          results: [],
          augmentedNarratives: extracted.narrativeSnippets,
          frameworkViolation: {
            framework: "US_GAAP_ASC330",
            violation: "IAS 2 inventory inputs not applicable under US GAAP lane",
            citation: "ASC 330",
            remediation: "Use manufacturing_inventory.asc330 structured inputs.",
            message: "US GAAP manufacturing filing cannot use IAS 2 inventory emitters.",
          },
        };
      }
      const results = hasAnyAsc330InventoryInput(extracted) ? runUsgaapInventoryLane(extracted) : [];
      const augmentedNarratives = [
        ...extracted.narrativeSnippets,
        ...results.flatMap((r) => (r.status === "satisfied" ? r.lines.map((l) => l.text) : [])),
      ];
      return { framework: extracted.framework, results, augmentedNarratives };
    }

    return { framework: extracted.framework, results: [], augmentedNarratives: extracted.narrativeSnippets };
  } catch (error) {
    if (error instanceof FrameworkViolationError) {
      return {
        framework: extracted.framework,
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

export function usgaapManufacturingInventoryOutputText(extracted: ExtractedFiling): string {
  const router = runManufacturingRouter(extracted);
  return router.results
    .filter((result) => result.emitterPath.includes("/lanes/manufacturing/emitters/"))
    .filter((result) => !result.emitterPath.includes("/ifrs/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function ifrsManufacturingInventoryOutputText(extracted: ExtractedFiling): string {
  const router = runManufacturingRouter(extracted);
  return router.results
    .filter((result) => result.emitterPath.includes("/lanes/manufacturing/emitters/ifrs/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}

export function withRouterNarratives(extracted: ExtractedFiling): ExtractedFiling {
  const router = runManufacturingRouter(extracted);
  return { ...extracted, narrativeSnippets: router.augmentedNarratives };
}
