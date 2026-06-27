import type { PrincipalAgentDetermination, PrincipalAgentRole, RetailPanelContext } from "../types";
import { RETAIL_DEFAULTS } from "../types";

export function determinePrincipalAgent(
  ctx: RetailPanelContext,
  facts: Omit<PrincipalAgentDetermination, "role" | "threeFactorThreshold">,
): PrincipalAgentDetermination {
  const indicators = [
    facts.primaryResponsibilityForFulfillment,
    facts.inventoryRisk,
    facts.pricingDiscretion,
  ];
  const trueCount = indicators.filter(Boolean).length;
  const threshold = RETAIL_DEFAULTS.principalAgentThreshold;
  let role: PrincipalAgentRole = trueCount >= threshold ? "PRINCIPAL" : "AGENT";

  if (ctx.subSegment.primary === "E" && ctx.subSegment.secondary === "O") {
    role = RETAIL_DEFAULTS.marketplaceAgentRole;
  }

  return {
    ...facts,
    role,
    threeFactorThreshold: 2,
  };
}
