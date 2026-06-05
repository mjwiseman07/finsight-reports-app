import { buildMemoryCandidate, type BuildMemoryCandidateInput, type BuildMemoryCandidateResult } from "./buildMemoryCandidate";

export function buildRecurringMarginDeclineCandidate(
  input: Omit<BuildMemoryCandidateInput, "candidateKind">,
): BuildMemoryCandidateResult {
  return buildMemoryCandidate({
    ...input,
    candidateKind: "recurring_margin_decline",
  });
}
