import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface EducationEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildEducationEmitterInput(extracted: ExtractedFiling): EducationEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function hasTuitionRevenueInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.education?.revenue?.tuition === "number";
}

export function hasContributionsInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.education?.revenue?.contributions === "number";
}

export function hasEndowmentInput(extracted: ExtractedFiling): boolean {
  const e = extracted.education?.endowment;
  return Boolean(e && typeof e.total === "number");
}

export function hasFunctionalExpenseInput(extracted: ExtractedFiling): boolean {
  const fn = extracted.expenses?.by_function;
  return Boolean(fn && typeof fn.program === "number");
}

export function hasTitleIvInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.education?.title_iv?.composite_score === "number";
}

export function hasRestrictedNetAssetsInput(extracted: ExtractedFiling): boolean {
  const e = extracted.education?.endowment;
  return Boolean(
    e &&
      typeof e.with_donor_restrictions === "number" &&
      typeof e.without_donor_restrictions === "number",
  );
}

export function hasAuxiliaryEnterprisesInput(extracted: ExtractedFiling): boolean {
  const a = extracted.education?.auxiliary_enterprises;
  return Boolean(a && typeof a.housing === "number");
}

export function isInternationalPublic(extracted: ExtractedFiling): boolean {
  return extracted.education?.jurisdiction === "international-public";
}

export function hasIpsasNonExchangeInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.education?.ipsas_non_exchange?.grant_revenue === "number";
}
