export function assertContainsSaaSARRData(ctx: {
  containsSaaSARRData?: boolean;
}): asserts ctx is { containsSaaSARRData: true } {
  if (ctx.containsSaaSARRData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsSaaSARRData must be true in saas module context.",
    );
  }
}
