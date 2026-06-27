/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export function assertContainsSaaSARRData(ctx: {
  containsSaaSARRData?: boolean;
}): asserts ctx is { containsSaaSARRData: true } {
  if (ctx.containsSaaSARRData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsSaaSARRData must be true in tagged revenue/saas module context.",
    );
  }
}
