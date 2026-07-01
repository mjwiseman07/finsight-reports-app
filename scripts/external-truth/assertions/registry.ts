/**
 * Phase G7-C5.5 — vertical assertion pack registry.
 *
 * Registers the 15-vertical substrate: 9 verticals are built and have real
 * assertion packs. The remaining 6 (edu, re, hos, log, bank, ins) are
 * registered with a shared no-op function until their packs are built.
 * The no-op preserves the exhaustive Record<ExternalTruthVertical, ...>
 * type contract without falsely implying assertion coverage.
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

/**
 * Shared no-op assertion pack. Used for verticals that are registered in the
 * ExternalTruthVertical type but do not yet have a built assertion pack.
 * Returns an empty result set — no assertions run, no assertions fail.
 *
 * When a real pack is built for one of these verticals:
 *   1. Create scripts/external-truth/assertions/<vertical>/index.ts with an
 *      `assertions` export matching the (ctx: ValidatorContext) => AssertionResult[] signature
 *   2. Import it here and replace the noAssertions binding in PACKS below
 */
const noAssertions = (_ctx: ValidatorContext): AssertionResult[] => [];

const PACKS: Record<ExternalTruthVertical, (ctx: ValidatorContext) => AssertionResult[]> = {
  // Built packs
  saas: saasAssertions,
  rtl: retailAssertions,
  hc: healthcareAssertions,
  npo: nonprofitAssertions,
  mfg: manufacturingAssertions,
  con: constructionAssertions,
  gc: govconAssertions,
  ps: professionalServicesAssertions,
  fa: fundAccountingAssertions,
  // Registered stubs — packs not yet built
  edu: noAssertions, // Education
  re: noAssertions, // Real Estate
  hos: noAssertions, // Hospitality
  log: noAssertions, // Logistics
  bank: noAssertions, // Banking
  ins: noAssertions, // Insurance
};

export function runVerticalAssertions(ctx: ValidatorContext): AssertionResult[] {
  const pack = PACKS[ctx.vertical];
  return pack ? pack(ctx) : [];
}

export function runFrameworkAssertions(ctx: ValidatorContext): AssertionResult[] {
  return frameworkAssertions(ctx);
}
