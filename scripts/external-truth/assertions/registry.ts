/**
 * Phase G7-C5.5 — vertical assertion pack registry.
 */
import type { ExternalTruthVertical } from "../types";
import type { AssertionResult, ValidatorContext } from "./types";
import { assertions as saasAssertions } from "./saas/index";
import { assertions as retailAssertions } from "./retail/index";
import { assertions as healthcareAssertions } from "./healthcare/index";
import { assertions as nonprofitAssertions } from "./nonprofit/index";
import { assertions as manufacturingAssertions } from "./manufacturing/index";
import { assertions as constructionAssertions } from "./construction/index";
import { assertions as govconAssertions } from "./govcon/index";
import { assertions as professionalServicesAssertions } from "./professional-services/index";
import { assertions as fundAccountingAssertions } from "./fund-accounting/index";
import { assertions as frameworkAssertions } from "./framework/index";

const PACKS: Record<ExternalTruthVertical, (ctx: ValidatorContext) => AssertionResult[]> = {
  saas: saasAssertions,
  rtl: retailAssertions,
  hc: healthcareAssertions,
  npo: nonprofitAssertions,
  mfg: manufacturingAssertions,
  con: constructionAssertions,
  gc: govconAssertions,
  ps: professionalServicesAssertions,
  fa: fundAccountingAssertions,
};

export function runVerticalAssertions(ctx: ValidatorContext): AssertionResult[] {
  const pack = PACKS[ctx.vertical];
  return pack ? pack(ctx) : [];
}

export function runFrameworkAssertions(ctx: ValidatorContext): AssertionResult[] {
  return frameworkAssertions(ctx);
}
