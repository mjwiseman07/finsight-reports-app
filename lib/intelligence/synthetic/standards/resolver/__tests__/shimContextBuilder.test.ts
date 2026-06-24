import assert from "node:assert/strict";
import { buildShimTreatmentContext } from "../shimContextBuilder";

const CASES = [
  { basis: "us_gaap_fasb", industry: "MANUFACTURING", expectCountry: "US" },
  { basis: "ifrs_iasb", industry: "MANUFACTURING", expectCountry: "GB" },
  { basis: "us_gaap_fasb", industry: "RETAIL", expectCountry: "US" },
  { basis: "ifrs_iasb", industry: "RETAIL", expectCountry: "GB" },
  { basis: "asc842_candidate", industry: "MANUFACTURING", expectCountry: "US" },
  { basis: "ifrs_sme", industry: "RETAIL", expectCountry: "GB" },
] as const;

export function runShimContextBuilderTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    try {
      const context = buildShimTreatmentContext({
        reportingBasis: testCase.basis,
        industry: testCase.industry,
      });
      assert.equal(context.input.jurisdiction.country, testCase.expectCountry);
      assert.equal(context.input.industry.industryCode, testCase.industry);
      assert.equal(context.historicalAttestedFramework, null);
      assert.equal(context.historicalInferredConfidence, "unknown");
      assert.ok(Array.isArray(context.precedenceTable.rules));
      assert.ok(context.precedenceTable.rules.length >= 10);
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `shimContextBuilder FAIL [${testCase.industry}/${testCase.basis}]:`,
        (error as Error).message,
      );
    }
  }

  try {
    buildShimTreatmentContext({
      reportingBasis: "bogus_basis" as "us_gaap_fasb",
      industry: "MANUFACTURING",
    });
    failed += 1;
    console.error("shimContextBuilder FAIL: unknown basis did not throw");
  } catch {
    passed += 1;
  }

  return { passed, failed };
}

if (require.main === module) {
  const result = runShimContextBuilderTests();
  console.log(`shimContextBuilder: ${result.passed} passed, ${result.failed} failed`);
  process.exit(result.failed === 0 ? 0 : 1);
}
