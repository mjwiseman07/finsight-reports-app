import { buildMemoryCandidate, type BuildMemoryCandidateInput, type BuildMemoryCandidateResult } from "./buildMemoryCandidate";

export function buildRecurringCashPressureCandidate(
  input: Omit<BuildMemoryCandidateInput, "candidateKind">,
): BuildMemoryCandidateResult {
  return buildMemoryCandidate({
    ...input,
    candidateKind: "recurring_cash_pressure",
  });
}
