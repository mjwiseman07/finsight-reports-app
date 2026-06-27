/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaasSubSegmentId } from "../types";
import { SaasViolation } from "../errors";

export class SubSegmentAmbiguityError extends Error {
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
  constructor(message: string, matches: SaasSubSegmentId[]) {
    super(message);
    this.name = "SubSegmentAmbiguityError";
    this.escalationAudits = [{ channel: "escalation-audit", code: "SAAS_SUBSEGMENT_AMBIGUITY", message: `${message}: ${matches.join(",")}` }];
  }
}

const NAICS_RULES: Array<{ pattern: RegExp; segment: SaasSubSegmentId }> = [
  { pattern: /^511210/, segment: "P" },
  { pattern: /^518210/, segment: "H" },
  { pattern: /^541511/, segment: "U" },
  { pattern: /^522320/, segment: "F" },
  { pattern: /^541512/, segment: "V" },
  { pattern: /^5112/, segment: "P" },
  { pattern: /^51121/, segment: "U" },
];

export function classifySaasSubSegment(ctx: { containsSaaSARRData?: boolean; naicsCode: string; revenueMix?: Partial<Record<SaasSubSegmentId, number>> }) {
  assertContainsSaaSARRData(ctx);
  const matches = [...new Set(NAICS_RULES.filter((r) => r.pattern.test(ctx.naicsCode)).map((r) => r.segment))];
  if (matches.length === 0) return "P";
  if (matches.length === 1) return matches[0];
  if (ctx.revenueMix) {
    const ranked = matches.map((s) => ({ s, v: ctx.revenueMix?.[s] ?? 0 })).sort((a, b) => b.v - a.v);
    if (ranked[0].v > ranked[1]?.v) return ranked[0].s;
  }
  throw new SubSegmentAmbiguityError("Ambiguous NAICS mapping", matches);
}
