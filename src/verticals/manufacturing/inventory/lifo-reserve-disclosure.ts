import type { LifoReserveDisclosure } from "../types";

export function buildLifoReserveDisclosure(input: {
  reserveAmount: number;
  liquidationIncomeRecognized: number;
  replacementCostDisclosed?: number;
  asOfDate: Date;
}): LifoReserveDisclosure {
  return {
    basis: "US_GAAP",
    reserveAmount: input.reserveAmount,
    liquidationIncomeRecognized: input.liquidationIncomeRecognized,
    replacementCostDisclosed: input.replacementCostDisclosed,
    asOfDate: input.asOfDate,
  };
}

export function assertUsGaapOnly(disclosure: LifoReserveDisclosure): void {
  if (disclosure.basis !== "US_GAAP") {
    throw new Error("LifoReserveDisclosure is structurally US_GAAP-only.");
  }
}
