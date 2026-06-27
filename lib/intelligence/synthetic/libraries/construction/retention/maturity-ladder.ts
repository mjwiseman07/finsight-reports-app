import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

type ConstructionCtx = { containsConstructionContractData?: boolean };

export function classifyRetentionMaturity(
  ctx: ConstructionCtx,
  monthsToMaturity: number,
  emitter: ConAuditEmitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  let bucket: "current" | "12-24-mo" | "24-plus-mo" = "current";
  if (monthsToMaturity > 24) bucket = "24-plus-mo";
  else if (monthsToMaturity > 12) bucket = "12-24-mo";
  emitter.emitPocProgress("retention-classified", { monthsToMaturity, bucket });
  return { bucket };
}
