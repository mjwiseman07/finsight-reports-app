import { assertProportionateConsolidationPermitted } from "./jv-runtime-guard";

function expectRefused(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes("REFUSED")) throw err;
}

const refused = ["MFG", "RTL", "FA", "HC", "GC", "SaaS", "Nonprofit", "IFRS-SME"];
for (const ind of refused) {
  try {
    assertProportionateConsolidationPermitted(ind, null);
    throw new Error("should refuse");
  } catch (e) {
    expectRefused(e);
  }
}
try {
  assertProportionateConsolidationPermitted("CONSTRUCTION", "R");
  throw new Error("R should refuse");
} catch (e) {
  expectRefused(e);
}
