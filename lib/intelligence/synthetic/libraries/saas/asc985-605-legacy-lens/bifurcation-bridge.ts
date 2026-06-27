/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

export function bridgeToOverTime(ctx: { containsSaaSARRData?: boolean }, input: { hybrid: boolean }) {
  assertContainsSaaSARRData(ctx);
  if (input.hybrid) return { bridge: "asc606-over-time" };
  return { bridge: "none" };
}

