import { assertContainsProfessionalEngagementData } from "../../lib/intelligence/synthetic/standards/doctrine/containsProfessionalEngagementData";
export function build(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);
  return { variant: "ssp-hierarchy-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}