import { assertProportionateConsolidationPermitted } from "./jv-runtime-guard";

const refused = ["MFG", "RTL", "FA", "HC", "GC", "SaaS", "Nonprofit", "IFRS-SME"];
for (const ind of refused) {
  try {
    assertProportionateConsolidationPermitted(ind, null);
    throw new Error("should refuse");
  } catch (e) {
    if (!String(e.message).includes("REFUSED")) throw e;
  }
}
try {
  assertProportionateConsolidationPermitted("CONSTRUCTION", "R");
  throw new Error("R should refuse");
} catch (e) {
  if (!String(e.message).includes("REFUSED")) throw e;
}
