/**
 * LOCK-VC C2 — vertical panel route registry (hash-map + eager validation).
 */
import { VERIFIER_AUDIT_CHANNELS } from "../../../../architecture-lane/verifier-42-7f/lib/vertical-registry";
import type { VerifierVertical } from "../../../../architecture-lane/verifier-42-7f/lib/vertical-registry";
import { routeRetailDisclosures } from "../../../../src/verticals/retail/disclosures/retail-disclosure-router";
import { computeForecastVariance } from "../../../../src/verticals/retail/kpi/forecast-variance";
import type { RetailKpiId } from "../../../../src/verticals/retail/kpi/evaluator";
import { RETAIL_KPI_APPLICABILITY } from "../../../../src/verticals/retail/kpi/evaluator";
import { routeRegSkDisclosures } from "../../../../src/verticals/manufacturing/disclosures/reg-sk-router";
import { computeForecastVariance as computeMfgForecastVariance } from "../../../../src/verticals/manufacturing/variance/forecast-variance-handler";

export type PanelRouteContext = Record<string, unknown>;

export type PanelRouteHandle = {
  readonly kpiEvaluator: (ctx: PanelRouteContext) => Promise<unknown>;
  readonly forecastVariance: (ctx: PanelRouteContext) => Promise<unknown>;
  readonly disclosureRouter: (ctx: PanelRouteContext) => Promise<unknown>;
  readonly auditChannelInventory: readonly string[];
};

function structuralHandle(vertical: VerifierVertical): PanelRouteHandle {
  return Object.freeze({
    kpiEvaluator: async () => ({ status: "structural", vertical }),
    forecastVariance: async () => ({ status: "structural", vertical }),
    disclosureRouter: async () => ({ status: "structural", vertical }),
    auditChannelInventory: Object.freeze([...VERIFIER_AUDIT_CHANNELS]),
  });
}

const retailRoute: PanelRouteHandle = Object.freeze({
  kpiEvaluator: async (ctx) =>
    Object.freeze({
      applicability: RETAIL_KPI_APPLICABILITY,
      ctx,
    }),
  forecastVariance: async (ctx) => {
    const kpiId = String(ctx.kpiId ?? "RTL-K-01") as RetailKpiId;
    return computeForecastVariance(
      ctx.panelContext as never,
      kpiId,
      Number(ctx.realized ?? 0),
      Number(ctx.forecast ?? 0),
    );
  },
  disclosureRouter: async (ctx) =>
    routeRetailDisclosures(ctx.panelContext as never, ctx.inventory as never),
  auditChannelInventory: Object.freeze([...VERIFIER_AUDIT_CHANNELS]),
});

const manufacturingRoute: PanelRouteHandle = Object.freeze({
  kpiEvaluator: async (ctx) => Object.freeze({ status: "variance-panel", ctx }),
  forecastVariance: async (ctx) =>
    computeMfgForecastVariance(
      String(ctx.varianceId ?? "MFG-V-01"),
      Number(ctx.forecast ?? 0),
      Number(ctx.realized ?? 0),
    ),
  disclosureRouter: async (ctx) =>
    routeRegSkDisclosures({
      segmentCount: Number(ctx.segmentCount ?? 1),
      lifoUsed: Boolean(ctx.lifoUsed),
      conflictMineralsRequired: Boolean(ctx.conflictMineralsRequired),
    }),
  auditChannelInventory: Object.freeze([...VERIFIER_AUDIT_CHANNELS]),
});

const nonprofitRoute: PanelRouteHandle = Object.freeze({
  kpiEvaluator: async (ctx) => Object.freeze({ status: "kv-matrix", ctx }),
  forecastVariance: async (ctx) => Object.freeze({ status: "structural", vertical: "nonprofit", ctx }),
  disclosureRouter: async (ctx) => Object.freeze({ status: "structural", vertical: "nonprofit", ctx }),
  auditChannelInventory: Object.freeze([...VERIFIER_AUDIT_CHANNELS]),
});

export const VERTICAL_ROUTE_REGISTRY: Record<VerifierVertical, PanelRouteHandle> = Object.freeze({
  healthcare: structuralHandle("healthcare"),
  manufacturing: manufacturingRoute,
  "fund-accounting": structuralHandle("fund-accounting"),
  govcon: structuralHandle("govcon"),
  construction: structuralHandle("construction"),
  "professional-services": structuralHandle("professional-services"),
  saas: structuralHandle("saas"),
  nonprofit: nonprofitRoute,
  retail: retailRoute,
});

export function resolvePanelRoute(vertical: VerifierVertical): PanelRouteHandle {
  const route = VERTICAL_ROUTE_REGISTRY[vertical];
  if (!route) {
    throw new Error(`Panel route not registered for vertical: ${vertical}`);
  }
  return route;
}

export function validateRouteRegistry(): void {
  const verticals: readonly VerifierVertical[] = [
    "healthcare",
    "manufacturing",
    "fund-accounting",
    "govcon",
    "construction",
    "professional-services",
    "saas",
    "nonprofit",
    "retail",
  ];
  for (const vertical of verticals) {
    if (!VERTICAL_ROUTE_REGISTRY[vertical]) {
      throw new Error(`Boot-time validation failed: route for ${vertical} not registered`);
    }
    const route = VERTICAL_ROUTE_REGISTRY[vertical];
    for (const handle of ["kpiEvaluator", "forecastVariance", "disclosureRouter"] as const) {
      if (typeof route[handle] !== "function") {
        throw new Error(`Boot-time validation failed: ${vertical}.${handle} not a function`);
      }
    }
    if (!Array.isArray(route.auditChannelInventory)) {
      throw new Error(`Boot-time validation failed: ${vertical}.auditChannelInventory missing`);
    }
  }
}

export function verifyPanelConsumerRoutesAllVerticals(
  registry: Record<VerifierVertical, PanelRouteHandle> = VERTICAL_ROUTE_REGISTRY,
): { passed: boolean; missing: readonly string[] } {
  const verticals: readonly VerifierVertical[] = [
    "healthcare",
    "manufacturing",
    "fund-accounting",
    "govcon",
    "construction",
    "professional-services",
    "saas",
    "nonprofit",
    "retail",
  ];
  const missing: string[] = [];
  for (const vertical of verticals) {
    if (!registry[vertical]) {
      missing.push(vertical);
      continue;
    }
    if (typeof registry[vertical].kpiEvaluator !== "function") {
      missing.push(`${vertical}.kpiEvaluator`);
    }
    if (typeof registry[vertical].forecastVariance !== "function") {
      missing.push(`${vertical}.forecastVariance`);
    }
    if (typeof registry[vertical].disclosureRouter !== "function") {
      missing.push(`${vertical}.disclosureRouter`);
    }
    if (!Array.isArray(registry[vertical].auditChannelInventory)) {
      missing.push(`${vertical}.auditChannelInventory`);
    }
  }
  return { passed: missing.length === 0, missing };
}

validateRouteRegistry();
