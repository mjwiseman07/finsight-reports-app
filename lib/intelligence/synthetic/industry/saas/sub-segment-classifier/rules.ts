import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaaSSubSegmentClassifierInput, SaaSSubSegment } from "./types";
import { SaaSSubSegmentAmbiguityError } from "./types";

const NAICS_RULES: Array<{ pattern: RegExp; segment: SaaSSubSegment }> = [
  { pattern: /^511210/, segment: "P" },
  { pattern: /^518210/, segment: "H" },
  { pattern: /^541511/, segment: "U" },
  { pattern: /^522320/, segment: "F" },
  { pattern: /^541512/, segment: "V" },
];

export function matchSubSegments(input: SaaSSubSegmentClassifierInput): SaaSSubSegment[] {
  const matches = new Set<SaaSSubSegment>();
  if (input.naicsCode) {
    for (const rule of NAICS_RULES) {
      if (rule.pattern.test(input.naicsCode)) matches.add(rule.segment);
    }
  }
  if (input.hostingOnly && input.subscriptionPricing && !input.onPremLicense) matches.add("P");
  if (input.onPremLicense || (input.professionalServicesPct ?? 0) > 0.15) matches.add("H");
  if (input.billingModel === "consumption" || input.billingModel === "metered") matches.add("U");
  if (input.freeTier && input.paidConversionPath) matches.add("F");
  if (input.verticalSignal && input.verticalSignal !== "none") matches.add("V");
  return [...matches];
}

export function applyClassifierRules(input: SaaSSubSegmentClassifierInput): SaaSSubSegment {
  const matches = matchSubSegments(input);
  if (matches.length === 0) return "P";
  if (matches.length === 1) return matches[0];
  if (input.revenueMix) {
    const ranked = matches
      .map((s) => ({ s, v: input.revenueMix?.[s] ?? 0 }))
      .sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SaaSSubSegmentAmbiguityError("Ambiguous SaaS sub-segment mapping", matches);
}

