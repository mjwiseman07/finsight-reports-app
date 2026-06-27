import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import type { ProfServicesClassifierInput, ProfServicesSubSegment } from "./types";
import { SubSegmentAmbiguityError } from "./types";

const NAICS_RULES: Array<{ pattern: RegExp; segment: ProfServicesSubSegment }> = [
  { pattern: /^5411(?:10|99)/, segment: "L" },
  { pattern: /^5412(?:11|13|14|19)/, segment: "A" },
  { pattern: /^5416(?:11|18)/, segment: "M" },
  { pattern: /^5415(?:12|13|19)/, segment: "I" },
  { pattern: /^5413(?:10|30|40|50)/, segment: "E" },
  { pattern: /^541(?:810|820|830|840|850|860|870|890|430|490)/, segment: "K" },
];

export function matchSubSegments(input: ProfServicesClassifierInput): ProfServicesSubSegment[] {
  const naics = input.naicsCode;
  const matches = NAICS_RULES.filter((r) => r.pattern.test(naics)).map((r) => r.segment);
  return [...new Set(matches)];
}

export function applyClassifierRules(input: ProfServicesClassifierInput): ProfServicesSubSegment {
  const matches = matchSubSegments(input);
  if (matches.length === 0) return "M";
  if (matches.length === 1) return matches[0];
  if (input.revenueMix) {
    const ranked = matches
      .map((s) => ({ s, v: input.revenueMix?.[s] ?? 0 }))
      .sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SubSegmentAmbiguityError("Ambiguous NAICS mapping", matches);
}

