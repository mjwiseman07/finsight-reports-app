import { buildMemoryCandidate, type BuildMemoryCandidateInput, type BuildMemoryCandidateResult } from "./buildMemoryCandidate";

export function buildRecurringCustomerConcentrationCandidate(
  input: Omit<BuildMemoryCandidateInput, "candidateKind">,
): BuildMemoryCandidateResult {
  return buildMemoryCandidate({
    ...input,
    candidateKind: "recurring_customer_concentration",
  });
}
