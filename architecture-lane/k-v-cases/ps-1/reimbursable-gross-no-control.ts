/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { classifyPrincipalVsAgent } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/principal-vs-agent";

export function runCases() {
  const gross = classifyPrincipalVsAgent({ positiveControlEvidence: true, amount: 1000 });
  const net = classifyPrincipalVsAgent({ positiveControlEvidence: false, amount: 1000 });
  return [
    {
      id: "KV-PVA-1",
      pass: gross.presentation === "gross" && gross.amount === 1000,
      reason: "gross when control evidence present",
    },
    {
      id: "KV-PVA-2",
      pass: net.presentation === "net" && net.amount === 0,
      reason: "net/agent default when no positive control evidence",
    },
  ];
}
