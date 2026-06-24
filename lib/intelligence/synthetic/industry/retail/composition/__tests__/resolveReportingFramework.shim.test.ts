import assert from "node:assert/strict";
import { resolveReportingFramework } from "../resolveReportingFramework";

const CASES = [
  { basis: "us_gaap_fasb", expectFramework: "us_gaap" },
  { basis: "ifrs_iasb", expectFramework: "ifrs_iasb" },
  { basis: "ifrs_sme", expectFramework: "ifrs_iasb" },
] as const;

export function runRtlShimTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    try {
      const got = resolveReportingFramework(testCase.basis);
      assert.equal(got, testCase.expectFramework);
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`RTL shim FAIL [${testCase.basis}]:`, (error as Error).message);
    }
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runRtlShimTests();
  console.log(`RTL shim: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
