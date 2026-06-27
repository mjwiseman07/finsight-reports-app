export function assertContainsSaaSARRData(ctx: {
  containsSaaSARRData?: boolean;
}): asserts ctx is { containsSaaSARRData: true } {
  if (ctx.containsSaaSARRData !== true) {
    const err = Object.assign(new Error("DOCTRINE_VIOLATION: containsSaaSARRData must be true in SaaS module context."), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_DOCTRINE_FLAG_MISMATCH", message: "containsSaaSARRData required" }],
    });
    throw err;
  }
}
