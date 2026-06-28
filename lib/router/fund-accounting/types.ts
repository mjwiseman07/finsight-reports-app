import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface FundAccountingEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  hasNetAssets: boolean;
  hasShares: boolean;
  hasNavNarrative: boolean;
  isNcsrOrNq: boolean;
}

export function buildFundAccountingEmitterInput(extracted: ExtractedFiling): FundAccountingEmitterInput {
  const narrativeHaystack = extracted.narrativeSnippets.join(" ").toLowerCase();
  const hasNetAssets = extracted.numericFacts.some((fact) => /netassets/i.test(fact.tag));
  const hasShares = extracted.numericFacts.some((fact) =>
    /sharesoutstanding|entitycommonstocksharesoutstanding/i.test(fact.tag),
  );
  const hasNavNarrative = /net asset value|\bnav\b|per share/i.test(narrativeHaystack);
  const isNcsrOrNq = /n-csr|n-q/i.test(extracted.formType) || /n-csr|n-q/i.test(narrativeHaystack);
  return {
    extracted,
    narrativeHaystack,
    hasNetAssets,
    hasShares,
    hasNavNarrative,
    isNcsrOrNq,
  };
}
