import { assertContainsConstructionContractData } from "../../lib/intelligence/synthetic/standards/doctrine/containsConstructionContractData";
export function build(ctx: { containsConstructionContractData?: boolean }) {
  assertContainsConstructionContractData(ctx);
  return { variant: "uninstalled-materials-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}