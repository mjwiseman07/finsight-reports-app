export function assertContainsProfessionalEngagementData(ctx: {
  containsProfessionalEngagementData?: boolean;
}): asserts ctx is { containsProfessionalEngagementData: true } {
  if (ctx.containsProfessionalEngagementData !== true) {
    throw new Error(
      "DOCTRINE_VIOLATION: containsProfessionalEngagementData must be true in prof-services module context.",
    );
  }
}
