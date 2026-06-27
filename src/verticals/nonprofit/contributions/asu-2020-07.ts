import type { ContributionInput, ContributionDetermination } from "../types";

export function classifyAsu202007(input: ContributionInput): ContributionDetermination {
  if (input.type === "EXCHANGE") {
    return {
      type: "EXCHANGE",
      reciprocity: "RECIPROCAL",
      conditional: false,
    };
  }

  return {
    type: "CONTRIBUTION",
    reciprocity: "NON_RECIPROCAL",
    conditional: Boolean(input.conditional),
    barrierExists: input.barrierExists,
    barrierType: input.barrierType,
    refundLiabilityRecognitionTiming:
      input.refundLiabilityRecognitionTimingOverride ?? "AT_RECEIPT",
  };
}

export function isAgencyTransaction(input: ContributionInput): boolean {
  return input.type === "EXCHANGE" && input.reciprocity === "RECIPROCAL";
}
