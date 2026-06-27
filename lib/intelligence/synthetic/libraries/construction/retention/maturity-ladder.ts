import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

export function classifyRetentionMaturity(ctx, monthsToMaturity, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  let bucket: "current" | "12-24-mo" | "24-plus-mo" = "current";
  if (monthsToMaturity > 24) bucket = "24-plus-mo";
  else if (monthsToMaturity > 12) bucket = "12-24-mo";
  emitter.emitPocProgress("retention-classified", { monthsToMaturity, bucket });
  return { bucket };
}
