import { assertContainsSaaSARRData } from "../../lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData";
export function build(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
  return { variant: "soc2-tsc-disclosure", frameworks: ["US_GAAP", "IFRS"] };
}