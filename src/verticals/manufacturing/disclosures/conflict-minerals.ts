export function evaluateConflictMinerals(input: {
  necessaryToFunctionalityOrProduction: boolean;
  rcoiDepth?: "STANDARD" | "EXTENDED";
}): { formSdRequired: boolean; rcoiInquiryDepth: "STANDARD" | "EXTENDED" } {
  return {
    formSdRequired: input.necessaryToFunctionalityOrProduction,
    rcoiInquiryDepth: input.rcoiDepth ?? "STANDARD",
  };
}

export function assertSecStatutoryThreshold(necessary: boolean): boolean {
  return necessary;
}
