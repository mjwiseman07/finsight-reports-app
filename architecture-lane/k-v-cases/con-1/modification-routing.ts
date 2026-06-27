/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { routeModification } from "../../../lib/intelligence/synthetic/libraries/construction/asc606/modifications";

export function runCases() {
  const separate = routeModification({ separateContract: true, remainingDistinct: false });
  const catchUp = routeModification({ separateContract: false, remainingDistinct: false });
  return [
    { id: "KV-MOD-1", pass: separate.path === "separate-contract", reason: "separate contract path" },
    { id: "KV-MOD-2", pass: catchUp.path === "cumulative-catch-up", reason: "cumulative catch-up path" },
  ];
}
