import { assertContainsConstructionContractData } from "../../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export const BENCHMARK_HANDLE = "NASBP.ThreeCs";
export function bounds(ctx: { containsConstructionContractData?: boolean }) {
  assertContainsConstructionContractData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "Construction_Benchmarks_Sources.md" };
}