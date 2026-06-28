import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkUnsupportedError } from "./errors";

export interface PsEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildPsEmitterInput(extracted: ExtractedFiling): PsEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function assertPsFrameworkSupported(extracted: ExtractedFiling): void {
  if (extracted.framework !== "us-gaap" && extracted.framework !== "ifrs") {
    throw new FrameworkUnsupportedError(`PS framework not supported: ${extracted.framework}`);
  }
}

export function hasUnbilledReceivablesInput(extracted: ExtractedFiling): boolean {
  const rec = extracted.receivables;
  const assets = extracted.contract_assets;
  return Boolean(
    rec &&
      rec.billed >= 0 &&
      rec.unbilled >= 0 &&
      assets &&
      assets.opening >= 0 &&
      assets.closing >= 0,
  );
}

export function hasPrincipalAgentInput(extracted: ExtractedFiling): boolean {
  const eng = extracted.engagement;
  return Boolean(
    eng &&
      (eng.classification === "principal" || eng.classification === "agent") &&
      eng.indicators.length > 0,
  );
}

export function hasFeeStructureInput(extracted: ExtractedFiling): boolean {
  const mix = extracted.revenue?.by_fee_structure;
  return Boolean(mix && Object.keys(mix).length >= 2);
}

export const HAPPY_PS_US_INPUT = {
  receivables: { billed: 420_000_000, unbilled: 180_000_000 },
  contract_assets: { opening: 150_000_000, closing: 180_000_000 },
  engagement: {
    classification: "principal" as const,
    indicators: [
      "controls service delivery and staffing",
      "bears inventory and delivery risk",
      "has pricing discretion over the engagement",
    ],
  },
  revenue: {
    by_fee_structure: {
      hourly: 8_500_000_000,
      fixed_fee: 12_200_000_000,
      retainer: 1_100_000_000,
    },
  },
};

export const HAPPY_PS_IFRS_AGENT_INPUT = {
  receivables: { billed: 95_000_000, unbilled: 42_000_000 },
  contract_assets: { opening: 38_000_000, closing: 42_000_000 },
  engagement: {
    classification: "agent" as const,
    indicators: [
      "does not control specialist service delivery",
      "pass-through reimbursable costs without markup",
      "earns commission-style fee on referral",
    ],
  },
};
