import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export const BENCHMARK_HANDLE = "ABA.EngagementLetter.Std";
export function bounds(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "Prof_Services_Benchmarks_Sources.md" };
}