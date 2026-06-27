import type { UniformGuidanceVintage } from "../types";

export type UgSection =
  | "PART_200"
  | "PART_225"
  | "PART_230"
  | "SINGLE_AUDIT"
  | "HHS_PARTIAL";

export function routeUgSection(
  vintage: UniformGuidanceVintage,
  section: UgSection,
): { section: UgSection; vintage: UniformGuidanceVintage["active"] } {
  if (vintage.active === "UG_2024_HHS_PARTIAL" && section === "HHS_PARTIAL") {
    return { section, vintage: vintage.active };
  }
  if (vintage.active === "UG_2014" || vintage.active === "UG_2024") {
    return { section, vintage: vintage.active };
  }
  return { section, vintage: vintage.active };
}

export function singleAuditThreshold(vintage: UniformGuidanceVintage): number {
  if (vintage.active === "UG_2014") {
    return vintage.thresholds.singleAudit;
  }
  if (vintage.active === "UG_2024") {
    return vintage.thresholds.singleAudit;
  }
  return 1_000_000;
}
