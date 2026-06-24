import assert from "node:assert/strict";
import { resolveReportingFramework } from "../resolveReportingFramework";

const CASES = [
  { basis: "us_gaap_fasb", expectFramework: "us_gaap" },
  { basis: "ifrs_iasb", expectFramework: "ifrs_iasb" },
  { basis: "asc842_candidate", expectFramework: "us_gaap" },
] as const;

export function runMfgShimTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    try {
      const got = resolveReportingFramework(testCase.basis);
      assert.equal(got, testCase.expectFramework);
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`MFG shim FAIL [${testCase.basis}]:`, (error as Error).message);
    }
  }

  try {
    const got = resolveReportingFramework("us_gaap_fasb", "any-company-id");
    assert.equal(got, "us_gaap");
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("MFG shim FAIL [companyId-passthrough-us]:", (error as Error).message);
  }

  try {
    const got = resolveReportingFramework("ifrs_iasb", "another-company-id");
    assert.equal(got, "ifrs_iasb");
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error("MFG shim FAIL [companyId-passthrough-ifrs]:", (error as Error).message);
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runMfgShimTests();
  console.log(`MFG shim: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
