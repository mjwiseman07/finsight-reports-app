/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { routeModification } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/contract-mods";

export function runCases() {
  const separate = routeModification({ separateContract: true, remainingDistinct: false });
  const folded = routeModification({ separateContract: false, remainingDistinct: false });
  return [
    {
      id: "KV-MOD-1",
      pass: separate.path === "separate-contract" && folded.path === "cumulative-catch-up",
      reason: "mod misroute separate vs folded",
    },
  ];
}
