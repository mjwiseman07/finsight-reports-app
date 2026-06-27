import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";
import { detectVerticalFamily } from "./vertical-detector";
import { applyHealthSaaSOverlay } from "./health-saas";
import { applyAccountingSaaSOverlay } from "./accounting-saas";
import { applyLegalSaaSOverlay } from "./legal-saas";

export function applyVerticalSaaSOverlay(
  ctx: { containsSaaSARRData?: boolean; containsPHI?: boolean },
  input: { subSegment: "V"; verticalSignal: "health" | "accounting" | "legal" },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const family = detectVerticalFamily(input);
  if (family === "health") return applyHealthSaaSOverlay(ctx, { evidencePresent: true }, emitter);
  if (family === "accounting") return applyAccountingSaaSOverlay(ctx, { evidencePresent: true }, emitter);
  return applyLegalSaaSOverlay(ctx, { evidencePresent: true }, emitter);
}

export * from "./vertical-detector";
export * from "./health-saas";
export * from "./accounting-saas";
export * from "./legal-saas";

