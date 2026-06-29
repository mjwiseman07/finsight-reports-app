import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface LogisticsEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildLogisticsEmitterInput(extracted: ExtractedFiling): LogisticsEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function hasFreightRevenueInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.logistics?.revenue?.freight === "number";
}

export function hasPrincipalOrAgentInput(extracted: ExtractedFiling): boolean {
  const role = extracted.logistics?.principal_or_agent;
  return role === "principal" || role === "agent";
}

export function hasBillAndHoldInput(extracted: ExtractedFiling): boolean {
  const b = extracted.logistics?.bill_and_hold;
  return Boolean(
    b &&
      typeof b.enabled === "boolean" &&
      typeof b.goods_ready === "boolean" &&
      typeof b.amount === "number",
  );
}

export function hasFuelHedgeInput(extracted: ExtractedFiling): boolean {
  const h = extracted.logistics?.fuel_hedge;
  return Boolean(
    h &&
      typeof h.notional === "number" &&
      typeof h.fair_value === "number" &&
      typeof h.effectiveness_pct === "number",
  );
}

export function hasImpairmentInput(extracted: ExtractedFiling): boolean {
  const i = extracted.logistics?.impairment;
  return Boolean(
    i &&
      typeof i.asset_group === "string" &&
      typeof i.carrying_amount === "number" &&
      typeof i.fair_value === "number",
  );
}

export function hasTerminalLeasesInput(extracted: ExtractedFiling): boolean {
  const t = extracted.logistics?.terminal_leases;
  return Boolean(t && typeof t.count === "number" && typeof t.total_liability === "number");
}

export function hasDemurrageDetentionInput(extracted: ExtractedFiling): boolean {
  const d = extracted.logistics?.demurrage_detention;
  return Boolean(d && typeof d.demurrage === "number" && typeof d.detention === "number");
}

export function hasFuelSurchargeInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.logistics?.revenue?.fuel_surcharge === "number";
}
