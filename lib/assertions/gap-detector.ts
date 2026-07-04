import type { AccountCategory, AssertionId } from "@/lib/pre-close/assertions-types";
import type { ProjectedCoverageRow, RootCauseCode } from "@/lib/pre-close/assertions-coverage-types";

export interface DetectedGap {
  account_category: AccountCategory;
  assertion_id: AssertionId;
  root_cause_code: RootCauseCode;
}

export function detectGaps(rows: ProjectedCoverageRow[]): DetectedGap[] {
  return rows
    .filter((r) => r.coverage_status === "gap" && r.gap_root_cause_code)
    .map((r) => ({
      account_category: r.account_category,
      assertion_id: r.assertion_id,
      root_cause_code: r.gap_root_cause_code as RootCauseCode,
    }));
}
