import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../audit/con-audit-emitter";

export function evaluate(ctx: { containsConstructionContractData?: boolean }, input: Record<string, unknown>, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  emitter.emitPocProgress("progress-measured", { module: "lease-runtime.ts", input });
  return { ok: true };
}
