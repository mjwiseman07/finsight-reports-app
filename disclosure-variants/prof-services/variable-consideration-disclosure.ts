import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export function build(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { variant: "variable-consideration-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}