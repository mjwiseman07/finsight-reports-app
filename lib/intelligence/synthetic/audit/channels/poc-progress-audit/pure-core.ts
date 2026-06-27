import type { POCProgressAuditOutcome } from "./types";

export function derivePOCProgressAuditContextPure(input: {
  outcome: POCProgressAuditOutcome;
  evidence: Record<string, unknown>;
}) {
  return {
    outcome: input.outcome,
    evidence: input.evidence,
    derivedAt: "pure-core",
  };
}
