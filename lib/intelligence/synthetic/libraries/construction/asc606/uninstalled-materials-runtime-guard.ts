import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

type ConstructionCtx = { containsConstructionContractData?: boolean };

export function evaluateUninstalledMaterialsRuntime(
  ctx: ConstructionCtx,
  input: { claimCarveOut: boolean; customized: boolean; customerControlledBeforeInstall?: boolean; transferDistinctFromInstall?: boolean },
  emitter: ConAuditEmitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  if (input.claimCarveOut && input.customized) {
    emitter.emitEscalation("CON_UNINSTALLED_ABUSE", "customized materials treated as carve-out");
    emitter.emitPocProgress("rejected-escalation", { input });
    throw Object.assign(new Error("CON_UNINSTALLED_ABUSE"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_UNINSTALLED_ABUSE", message: "carve-out abuse" }],
    });
  }
  const carveOut = !input.customized && input.customerControlledBeforeInstall && input.transferDistinctFromInstall;
  if (!carveOut) {
    emitter.emitPocProgress("uninstalled-materials-evaluated", { includedInPoc: true, gate: "forced-inclusion", input });
    return { includedInPoc: true, carveOut: false };
  }
  emitter.emitPocProgress("uninstalled-materials-evaluated", { includedInPoc: false, carveOut: true, input });
  return { includedInPoc: false, carveOut: true };
}
