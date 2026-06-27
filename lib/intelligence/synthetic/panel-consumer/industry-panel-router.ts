/**
 * LOCK-VC C2 — industry panel router (hash-map resolution).
 */
import type { VerifierVertical } from "../../../../architecture-lane/verifier-42-7f/lib/vertical-registry";
import {
  resolvePanelRoute,
  type PanelRouteContext,
  type PanelRouteHandle,
} from "./vertical-route-registry";

export function mapIndustryHandleToVerifierVertical(industryHandle: string): VerifierVertical {
  const normalized = industryHandle.toLowerCase().replace(/_/g, "-");
  const aliases: Record<string, VerifierVertical> = {
    healthcare: "healthcare",
    hc: "healthcare",
    manufacturing: "manufacturing",
    mfg: "manufacturing",
    "fund-accounting": "fund-accounting",
    fa: "fund-accounting",
    govcon: "govcon",
    gc: "govcon",
    construction: "construction",
    con: "construction",
    "professional-services": "professional-services",
    ps: "professional-services",
    saas: "saas",
    nonprofit: "nonprofit",
    npo: "nonprofit",
    retail: "retail",
    rtl: "retail",
  };
  const vertical = aliases[normalized];
  if (!vertical) {
    throw new Error(`Unknown industry handle for panel routing: ${industryHandle}`);
  }
  return vertical;
}

export async function routeIndustryPanel(
  industryHandle: string,
  ctx: PanelRouteContext,
): Promise<{
  readonly route: PanelRouteHandle;
  readonly kpi: unknown;
  readonly forecastVariance: unknown;
  readonly disclosure: unknown;
}> {
  const vertical = mapIndustryHandleToVerifierVertical(industryHandle);
  const route = resolvePanelRoute(vertical);
  const [kpi, forecastVariance, disclosure] = await Promise.all([
    route.kpiEvaluator(ctx),
    route.forecastVariance(ctx),
    route.disclosureRouter(ctx),
  ]);
  return Object.freeze({ route, kpi, forecastVariance, disclosure });
}
