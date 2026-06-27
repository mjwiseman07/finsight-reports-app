import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";


export function applyPracticalExpedient(
  ctx: { containsSaaSARRData?: boolean },
  input: { periodMonths: number },
) {
  assertContainsSaaSARRData(ctx);
  if (input.periodMonths > 12) {
    throw new Error("SAAS_COMMISSION_EXPEDIENT_EXCEEDED");
  }
  return { expedientApplied: true, logged: true };
}

