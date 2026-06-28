import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkViolationError } from "../errors/FrameworkViolationError";

export type OutputMeasureMethod = "cost-to-cost" | "units-of-delivery" | "milestones";

export const VALID_OUTPUT_MEASURE_METHODS = new Set<OutputMeasureMethod>([
  "cost-to-cost",
  "units-of-delivery",
  "milestones",
]);

export interface ConstructionEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  hasContractRevenueTag: boolean;
  hasContractLiabilityNarrative: boolean;
  hasAssetFacts: boolean;
  outputMeasureMethod: OutputMeasureMethod;
}

export function buildConstructionEmitterInput(extracted: ExtractedFiling): ConstructionEmitterInput {
  const narrativeHaystack = extracted.narrativeSnippets.join(" ").toLowerCase();
  const hasContractRevenueTag = extracted.numericFacts.some((fact) =>
    /contractwithcustomer|revenuefromcontract/i.test(fact.tag),
  );
  const hasContractLiabilityNarrative = /contract liability|contract asset|billings in excess/i.test(
    narrativeHaystack,
  );
  const hasAssetFacts = extracted.numericFacts.some((fact) => /asset/i.test(fact.tag));
  const outputMeasureMethod = resolveOutputMeasureMethod(extracted);
  return {
    extracted,
    narrativeHaystack,
    hasContractRevenueTag,
    hasContractLiabilityNarrative,
    hasAssetFacts,
    outputMeasureMethod,
  };
}

export function resolveOutputMeasureMethod(extracted: ExtractedFiling): OutputMeasureMethod {
  const declared = extracted.construction?.output_measure?.method;
  if (declared) {
    assertValidOutputMeasureMethod(extracted, declared);
    return declared;
  }
  return "cost-to-cost";
}

export function assertValidOutputMeasureMethod(
  extracted: ExtractedFiling,
  method: string,
): asserts method is OutputMeasureMethod {
  if (VALID_OUTPUT_MEASURE_METHODS.has(method as OutputMeasureMethod)) {
    return;
  }
  const citation =
    extracted.framework === "ifrs" ? "IFRS 15.B14" : "ASC 606-10-25-31";
  throw new FrameworkViolationError(
    extracted.framework,
    `Unrecognized output_measure.method: ${method}`,
    citation,
    'Declare output_measure.method as "cost-to-cost", "units-of-delivery", or "milestones".',
  );
}

export function hasUnitsOfDeliveryInput(extracted: ExtractedFiling): boolean {
  const measure = extracted.construction?.output_measure;
  return Boolean(
    measure?.method === "units-of-delivery" &&
      measure.unit_definition &&
      measure.unit_progress !== undefined,
  );
}

export function hasMilestoneInput(extracted: ExtractedFiling): boolean {
  const measure = extracted.construction?.output_measure;
  return Boolean(
    measure?.method === "milestones" &&
      measure.milestones_defined &&
      measure.milestones_defined.length > 0 &&
      measure.milestones_achieved &&
      measure.milestones_achieved.length > 0,
  );
}

export function hasPostCompletionInput(extracted: ExtractedFiling): boolean {
  const post = extracted.construction?.post_completion;
  return Boolean(
    post &&
      post.warranty_obligation &&
      post.retainage_balance >= 0 &&
      post.adjustment_history,
  );
}

export const HAPPY_UNITS_US = {
  output_measure: {
    method: "units-of-delivery" as const,
    unit_definition: "completed housing units",
    unit_progress: 142,
  },
};

export const HAPPY_MILESTONES_US = {
  output_measure: {
    method: "milestones" as const,
    milestones_defined: ["foundation complete", "superstructure complete", "final inspection"],
    milestones_achieved: ["foundation complete", "superstructure complete"],
  },
};

export const HAPPY_POST_COMPLETION_US = {
  post_completion: {
    warranty_obligation: "two-year structural warranty provision",
    retainage_balance: 48_500_000,
    adjustment_history: "post-completion cost true-up using incurred cost relative to estimated total cost",
  },
  contract_balances: {
    contract_assets: 320_000_000,
    contract_liabilities: 95_000_000,
  },
};
