import curatedPrecedenceTable from "../treatment-precedence-table.json";
import { CITATION_URLS } from "../citation-handles";
import type { TreatmentPrecedenceTable } from "../types";

const REQUIRED_RULE_FIELDS = [
  "ruleId",
  "industryFilter",
  "jurisdictionFilter",
  "orgElectionRequired",
  "produces",
  "precedenceWeight",
  "citationRef",
  "reason",
] as const;

export function runCitationHandlesTests(): number {
  const table = curatedPrecedenceTable as TreatmentPrecedenceTable;

  JSON.parse(JSON.stringify(table));

  for (const rule of table.rules) {
    for (const field of REQUIRED_RULE_FIELDS) {
      if (!(field in rule)) {
        throw new Error(`Rule ${rule.ruleId ?? "unknown"} missing field: ${field}`);
      }
    }
    if (!(rule.citationRef in CITATION_URLS)) {
      throw new Error(`Rule ${rule.ruleId} citationRef not in CITATION_URLS: ${rule.citationRef}`);
    }
  }

  return 1;
}

if (require.main === module) {
  try {
    const count = runCitationHandlesTests();
    console.log(`PASS citationHandles (${count} checks)`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
