import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkUnsupportedError } from "./errors";

export interface RetailEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildRetailEmitterInput(extracted: ExtractedFiling): RetailEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function assertRetailIfrsSupported(extracted: ExtractedFiling): void {
  if (extracted.framework !== "ifrs") {
    throw new FrameworkUnsupportedError(`Retail IFRS emitter requires IFRS framework, got ${extracted.framework}`);
  }
}

export function getCostFormula(extracted: ExtractedFiling): string | undefined {
  return extracted.inventory?.cost_formula ?? extracted.inventoryMethod;
}

export function hasCarryingAmounts(extracted: ExtractedFiling): boolean {
  const amounts = extracted.inventory?.carrying_amounts;
  return Boolean(amounts && Object.keys(amounts).length >= 1);
}

export const HAPPY_FIFO_INVENTORY = {
  cost_formula: "FIFO" as const,
  carrying_amounts: { finished_goods: 1_200_000_000, merchandise: 800_000_000 },
};

export const HAPPY_WEIGHTED_AVERAGE_INVENTORY = {
  cost_formula: "weighted_average" as const,
  carrying_amounts: { finished_goods: 950_000_000, merchandise: 620_000_000 },
};
