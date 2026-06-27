import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export function build(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { variant: "ifrs-dual-framework-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}