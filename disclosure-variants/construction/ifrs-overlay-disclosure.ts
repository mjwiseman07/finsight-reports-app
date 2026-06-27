import { assertContainsConstructionContractData } from "../../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export function build(ctx: { containsConstructionContractData?: boolean }) {
  assertContainsConstructionContractData(ctx);
  return { variant: "ifrs-overlay-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}