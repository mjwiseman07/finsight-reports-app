import { basisOf } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";
import type { RetailEvaluatorResult } from "./types";

export function authorizeLeaseBasisRoute(
  reportingFramework: StandardsReportingFramework,
  category: "asc842_candidate" | "ifrs16_lessee_candidate",
): RetailEvaluatorResult<"asc842_candidate" | "ifrs16_lessee_candidate"> {
  const basis = basisOf(reportingFramework);

  if (category === "asc842_candidate") {
    return { ok: true, value: basis === "US_GAAP" ? "asc842_candidate" : "ifrs16_lessee_candidate" };
  }
  if (category === "ifrs16_lessee_candidate") {
    return { ok: true, value: basis === "IFRS" ? "ifrs16_lessee_candidate" : "asc842_candidate" };
  }
  return { ok: false, error: "LEASE_FRAMEWORK_LITERAL_REJECTED" };
}
