export function assertContainsConstructionContractData(ctx: {
  containsConstructionContractData?: boolean;
}): asserts ctx is { containsConstructionContractData: true } {
  if (ctx.containsConstructionContractData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsConstructionContractData must be true in construction module context.",
    );
  }
}
