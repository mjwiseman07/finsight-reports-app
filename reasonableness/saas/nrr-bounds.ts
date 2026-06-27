import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export const BENCHMARK_HANDLE = "KeyBanc.SaaSSurvey";
export function bounds(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { handle: BENCHMARK_HANDLE, source: "SaaS_Benchmarks_Sources.md" };
}