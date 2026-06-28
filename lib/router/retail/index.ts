import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { citationResolved, type EmitterResult } from "../types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import { MissingDisclosureInputError } from "./errors";
import { assertRetailIfrsSupported, buildRetailEmitterInput } from "./types";
import * as ifrsInventory from "./ifrs/inventoryMethodDeclaration";
import {
  buildRetailIfrs16LeaseEmitterInput,
  buildRetailLeaseEmitterInput,
  hasAnyLeaseAsc842Input,
  hasAnyLeaseIfrs16Input,
  hasLeaseCostBreakdownInput,
  hasLeaseExpenseBreakdownInput,
  hasLeaseMaturityInput,
  hasLeaseMaturityIfrsInput,
  hasLeaseWeightedAveragesInput,
  hasRouRollforwardInput,
} from "../lanes/retail/types";
import * as leaseCost from "../lanes/retail/emitters/leaseCostBreakdown";
import * as leaseWeighted from "../lanes/retail/emitters/leaseWeightedAverages";
import * as leaseMaturity from "../lanes/retail/emitters/leaseMaturityReconciliation";
import * as ifrsLeaseExpense from "../lanes/retail/emitters/ifrs/leaseExpenseBreakdown";
import * as ifrsLeaseMaturity from "../lanes/retail/emitters/ifrs/leaseMaturityIFRS";
import * as ifrsRouRollforward from "../lanes/retail/emitters/ifrs/rouAssetRollforward";

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

function frameworkViolationFromError(error: FrameworkViolationError): RetailFrameworkViolation {
  return {
    framework: error.framework,
    violation: error.violation,
    citation: error.citation,
    remediation: error.remediation,
    message: error.message,
  };
}

function runRetailIfrsLeaseLane(extracted: ExtractedFiling): EmitterResult[] {
  const input = buildRetailIfrs16LeaseEmitterInput(extracted);
  const results: EmitterResult[] = [];

  if (hasLeaseExpenseBreakdownInput(extracted)) {
    results.push(
      wrapEmit("lease-expense-breakdown", ifrsLeaseExpense.EMITTER_PATH, () =>
        ifrsLeaseExpense.emitLeaseExpenseBreakdown(input),
      ),
    );
  }
  if (hasLeaseMaturityIfrsInput(extracted)) {
    results.push(
      wrapEmit("lease-maturity-ifrs", ifrsLeaseMaturity.EMITTER_PATH, () =>
        ifrsLeaseMaturity.emitLeaseMaturityIFRS(input),
      ),
    );
  }
  if (hasRouRollforwardInput(extracted)) {
    results.push(
      wrapEmit("rou-asset-rollforward", ifrsRouRollforward.EMITTER_PATH, () =>
        ifrsRouRollforward.emitRouAssetRollforward(input),
      ),
    );
  }

  return results;
}

function runRetailIfrsLane(extracted: ExtractedFiling): RetailRouterOutput {
  if (hasAnyLeaseAsc842Input(extracted)) {
    return {
      frameworkLane: extracted.framework,
      results: [],
      augmentedNarratives: extracted.narrativeSnippets,
      frameworkViolation: {
        framework: "IFRS_16",
        violation: "US GAAP ASC 842 lease inputs not applicable under IFRS 16 single-model lane",
        citation: "IFRS 16",
        remediation: "Use leases.ifrs16 structured inputs for IFRS 16 lessee disclosures.",
        message: "IFRS retail filing cannot use US GAAP ASC 842 lease emitters.",
      },
    };
  }

  try {
    const leaseResults = hasAnyLeaseIfrs16Input(extracted) ? runRetailIfrsLeaseLane(extracted) : [];

    if (!hasAnyLeaseIfrs16Input(extracted)) {
      assertRetailIfrsSupported(extracted);
      const input = buildRetailEmitterInput(extracted);
      const inventoryResults = [
        wrapEmit("inventory-method-declaration", ifrsInventory.EMITTER_PATH, () =>
          ifrsInventory.emitInventoryMethodDeclaration(input),
        ),
      ];
      const results = [...leaseResults, ...inventoryResults];
      const augmentedNarratives = [
        ...extracted.narrativeSnippets,
        ...results.flatMap((result) =>
          result.status === "satisfied" ? result.lines.map((line) => line.text) : [],
        ),
      ];
      return { frameworkLane: extracted.framework, results, augmentedNarratives };
    }

    const results = leaseResults;
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
        frameworkViolation: frameworkViolationFromError(error),
      };
    }
    throw error;
  }
}

function runRetailUsgaapLane(extracted: ExtractedFiling): RetailRouterOutput {
  if (hasAnyLeaseIfrs16Input(extracted)) {
    return {
      frameworkLane: extracted.framework,
      results: [],
      augmentedNarratives: extracted.narrativeSnippets,
      frameworkViolation: {
        framework: "US_GAAP_ASC842",
        violation: "IFRS 16 lease inputs not applicable under US GAAP ASC 842 dual-model lane",
        citation: "ASC 842",
        remediation: "Use leases.asc842 structured inputs for US GAAP lessee disclosures.",
        message: "US GAAP retail filing cannot use IFRS 16 single-model lease emitters.",
      },
    };
  }

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
        frameworkViolation: frameworkViolationFromError(error),
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

export function ifrsRetailLeaseOutputText(extracted: ExtractedFiling): string {
  const router = runRetailRouter({ ...extracted, framework: "ifrs", rawFrameworkSignals: ["ifrs-full"] });
  return router.results
    .filter((result) => result.emitterPath.includes("/emitters/ifrs/"))
    .filter((result) => result.status === "satisfied")
    .flatMap((result) => result.lines.map((line) => line.text))
    .join("\n");
}
