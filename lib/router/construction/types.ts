import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface ConstructionEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  hasContractRevenueTag: boolean;
  hasContractLiabilityNarrative: boolean;
  hasAssetFacts: boolean;
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
  return {
    extracted,
    narrativeHaystack,
    hasContractRevenueTag,
    hasContractLiabilityNarrative,
    hasAssetFacts,
  };
}
