/**
 * G7-V discovered disclosure entry point (Step 1).
 * No src/disclosures/generate.ts — LOCK-G7 uses per-vertical routers in lib/router/.
 */
import type { ExtractedFiling, RouterFramework } from "../../scripts/external-truth/types";
import type { EmitterResult } from "../../lib/router/types";
import { runHealthcareRouter } from "../../lib/router/healthcare";
import { runManufacturingRouter } from "../../lib/router/manufacturing";
import { runRetailRouter } from "../../lib/router/retail";
import { runFundAccountingRouter } from "../../lib/router/fund-accounting";
import { runGovconRouter } from "../../lib/router/govcon";
import { runConstructionRouter } from "../../lib/router/construction";
import { runProfessionalServicesRouter } from "../../lib/router/professional-services";
import { runSaasRouter } from "../../lib/router/saas";
import { runNonprofitRouter } from "../../lib/router/nonprofit";
import { runEducationRouter } from "../../lib/router/education";
import { runRealEstateRouter } from "../../lib/router/real-estate";
import { runHospitalityRouter } from "../../lib/router/hospitality";
import { runLogisticsRouter } from "../../lib/router/logistics";
import { runInsuranceRouter } from "../../lib/router/insurance";
import { runBankingRouter } from "../../lib/router/banking";

export type RouterOutput = {
  framework: RouterFramework;
  results: EmitterResult[];
  augmentedNarratives: string[];
  frameworkViolation?: {
    framework: string;
    violation: string;
    citation: string;
    remediation: string;
    message: string;
  };
};

export type DisclosureDocument = RouterOutput & {
  verticalCode: string;
  filingId: string;
  satisfiedEmitters: number;
  failClosedEmitters: number;
};

type RouterFn = (extracted: ExtractedFiling) => RouterOutput;

const ROUTERS: Record<string, RouterFn> = {
  healthcare: runHealthcareRouter,
  manufacturing: runManufacturingRouter,
  retail: runRetailRouter,
  "fund-accounting": runFundAccountingRouter,
  govcon: runGovconRouter,
  construction: runConstructionRouter,
  "professional-services": runProfessionalServicesRouter,
  saas: runSaasRouter,
  nonprofit: runNonprofitRouter,
  education: runEducationRouter,
  "real-estate": runRealEstateRouter,
  hospitality: runHospitalityRouter,
  logistics: runLogisticsRouter,
  insurance: runInsuranceRouter,
  banking: runBankingRouter,
};

export function generateDisclosure(
  extracted: ExtractedFiling,
  verticalCode: string,
): DisclosureDocument {
  const router = ROUTERS[verticalCode];
  if (!router) {
    throw new Error(`No router registered for vertical code: ${verticalCode}`);
  }

  const output = router(extracted);
  const satisfied = output.results.filter((r) => r.status === "satisfied").length;
  const failClosed = output.results.filter((r) => r.status === "fail-closed").length;

  return {
    ...output,
    verticalCode,
    filingId: extracted.filingId,
    satisfiedEmitters: satisfied,
    failClosedEmitters: failClosed,
  };
}

export const DISCLOSURE_ENTRY_POINT =
  "lib/router/{vertical}/index.ts — run*Router(extracted: ExtractedFiling)";
