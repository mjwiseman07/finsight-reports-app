import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

export function bridgeToOverTime(ctx: { containsSaaSARRData?: boolean }, input: { hybrid: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.hybrid) return { bridge: "asc606-over-time" };
  return { bridge: "none" };
}

