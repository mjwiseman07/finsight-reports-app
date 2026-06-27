import type { ContributionDetermination, ContributionInput } from "../types";

export class BarrierDeterminationUnsetError extends Error {
  constructor(transactionId: string) {
    super(
      `ASU 2018-08 barrier determination not declared for transaction ${transactionId}. ` +
        "Founder/CPA must explicitly set barrierExists before routing.",
    );
    this.name = "BarrierDeterminationUnsetError";
  }
}

export function classifyTransaction(input: ContributionInput): ContributionDetermination {
  if (input.type === "EXCHANGE") {
    return {
      type: "EXCHANGE",
      reciprocity: "RECIPROCAL",
      conditional: false,
    };
  }

  if (input.type === "CONTRIBUTION" && input.conditional && input.barrierExists === undefined) {
    throw new BarrierDeterminationUnsetError(input.transactionId);
  }

  if (input.type === "CONTRIBUTION" && input.conditional) {
    return {
      type: "CONTRIBUTION",
      reciprocity: "NON_RECIPROCAL",
      conditional: true,
      barrierExists: input.barrierExists,
      barrierType: input.barrierType,
      refundLiabilityRecognitionTiming:
        input.refundLiabilityRecognitionTimingOverride ?? "AT_RECEIPT",
    };
  }

  return {
    type: "CONTRIBUTION",
    reciprocity: input.reciprocity ?? "NON_RECIPROCAL",
    conditional: false,
  };
}
