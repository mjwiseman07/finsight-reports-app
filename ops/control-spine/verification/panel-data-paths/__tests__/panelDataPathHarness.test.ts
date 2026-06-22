/**
 * Panel data path harness tests — delegates to static construction suite.
 * containsVerticalComplianceLogic: false executable: false
 */
import { executePanelDataPathStaticConstructionTests } from "../panelDataPathStaticConstructionTests";

export function runPanelDataPathHarnessTests(): boolean {
  const result = executePanelDataPathStaticConstructionTests();
  if (!result.pass) {
    for (const failure of result.results.filter((entry) => !entry.passed)) {
      console.error(`FAIL ${failure.caseId}: expected decision mismatch (${failure.reason})`);
    }
  }
  return result.pass;
}

if (require.main === module) {
  process.exit(runPanelDataPathHarnessTests() ? 0 : 1);
}
