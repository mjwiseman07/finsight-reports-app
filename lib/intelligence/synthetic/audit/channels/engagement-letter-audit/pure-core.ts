import type { EngagementLetterAuditOutcome } from "./types";

export function deriveEngagementLetterAuditContextPure(input: {
  outcome: EngagementLetterAuditOutcome;
  evidence: Record<string, unknown>;
}) {
  return {
    outcome: input.outcome,
    evidence: input.evidence,
    derivedAt: "pure-core",
  };
}
