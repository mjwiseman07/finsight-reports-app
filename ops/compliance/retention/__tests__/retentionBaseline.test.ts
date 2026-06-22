/**
 * Retention baseline tests — delegates to FM-1 binding suite.
 * containsVerticalComplianceLogic: false executable: false
 */
import { executeRetentionBaselineFM1BindingTests } from "../retentionBaselineFM1BindingTests";

export function runRetentionBaselineTests(): boolean {
  const result = executeRetentionBaselineFM1BindingTests();
  if (!result.pass) {
    for (const failure of result.results.filter((entry) => !entry.passed)) {
      console.error(`FAIL ${failure.caseId}: ${failure.description}`);
    }
  }
  return result.pass;
}

if (require.main === module) {
  process.exit(runRetentionBaselineTests() ? 0 : 1);
}
