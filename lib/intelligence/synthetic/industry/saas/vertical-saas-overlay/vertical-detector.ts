import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";


export function detectVerticalFamily(input: { verticalSignal?: "health" | "accounting" | "legal" | "none" }) {
  if (!input.verticalSignal || input.verticalSignal === "none") {
    throw Object.assign(new Error("SAAS_VERTICAL_AMBIGUOUS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_AMBIGUOUS", message: "vertical" }],
    });
  }
  return input.verticalSignal;
}

