import type { ArrMrrAuditOutcome } from "./types";

export function deriveArrMrrAuditContextPure(input: { outcome: ArrMrrAuditOutcome; evidence: Record<string, unknown> }) {
  return { outcome: input.outcome, evidence: input.evidence, derivedAt: "pure-core" };
}
