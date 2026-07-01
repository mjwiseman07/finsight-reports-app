import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkUnsupportedError } from "./errors";

export type NonprofitFrameworkLane = "us-gaap" | "ipsas" | "ifrs-for-smes";

export interface NonprofitEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

const STANDARD_NATURE_KEYS = ["salaries", "occupancy", "depreciation", "professional_fees"] as const;

export function resolveNonprofitFrameworkLane(extracted: ExtractedFiling): NonprofitFrameworkLane {
  if (extracted.rawFrameworkSignals.includes("ifrs_for_smes")) {
    return "ifrs-for-smes";
  }
  if (extracted.framework === "ipsas") {
    return "ipsas";
  }
  if (extracted.framework === "us-gaap") {
    return "us-gaap";
  }
  throw new FrameworkUnsupportedError(`NPO framework not supported: ${extracted.framework}`);
}

export function buildNonprofitEmitterInput(extracted: ExtractedFiling): NonprofitEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function hasRequiredFunctionExpenses(extracted: ExtractedFiling): boolean {
  const fn = extracted.expenses?.by_function;
  return Boolean(fn && fn.program >= 0 && fn.management_general >= 0 && fn.fundraising >= 0);
}

export function hasRequiredNatureExpenses(extracted: ExtractedFiling): boolean {
  const nature = extracted.expenses?.by_nature;
  if (!nature) {
    return false;
  }
  return STANDARD_NATURE_KEYS.every((key) => typeof nature[key] === "number");
}

export function hasPart9Part10CrossTie(extracted: ExtractedFiling): boolean {
  const partIx = extracted.form990?.partIX?.totalFunctionalExpenses;
  const partX = extracted.form990?.partX?.totalAssetsEnd;
  const revenue = extracted.form990?.partVIII?.totalRevenue ?? extracted.numericFacts.find((f) => f.tag === "totrevenue")?.value;
  const assets = extracted.form990?.partX?.totalAssetsEnd ?? extracted.numericFacts.find((f) => f.tag === "totassetsend")?.value;
  return (
    (typeof partIx === "number" && typeof partX === "number" && partIx > 0 && partX > 0) ||
    (typeof revenue === "number" && typeof assets === "number" && revenue > 0 && assets > 0)
  );
}

export const HAPPY_NPO_EXPENSES = {
  by_function: { program: 2_100_000, management_general: 450_000, fundraising: 180_000 },
  by_nature: {
    salaries: 1_500_000,
    occupancy: 320_000,
    depreciation: 210_000,
    professional_fees: 95_000,
  },
  allocation_basis: "direct identification with time studies for shared costs",
};

export const HAPPY_ALLOCATION_METHODOLOGY = {
  method: "time study",
  rationale: "Shared costs allocated using periodic FTE time studies and direct identification where observable.",
};

export const HAPPY_SERVICE_COSTS = {
  by_program: { health: 1_200_000, education: 800_000 },
  allocation_basis: "direct service tracing with IPSAS 1.115 service costing",
};
