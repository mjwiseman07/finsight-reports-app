import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export function build(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { variant: "commission-capitalization-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}