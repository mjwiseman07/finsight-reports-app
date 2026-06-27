import type { NonGaapBasis, RDenomination } from "../types";
import { FrameworkUnsetError } from "../../../framework/cross-blend";

export function validateNonGaapBasis(basis: NonGaapBasis | undefined): NonGaapBasis {
  if (!basis) {
    throw new FrameworkUnsetError("NON_GAAP basis must be explicitly declared.");
  }
  return basis;
}

export function validateDenominationalBasis(
  basis: NonGaapBasis,
  denomination: RDenomination,
): void {
  if (basis.basis !== "DENOMINATIONAL") {
    return;
  }
  if (denomination === "multi" && !basis.denominationNote) {
    throw new Error("Multi-denomination entities require denominationNote (Q-H1=B).");
  }
}

export function assertSingleFramework(
  declared: string | undefined,
  attempted: string,
): void {
  if (declared && declared !== attempted) {
    throw new Error(`Framework comingling blocked: declared=${declared}, attempted=${attempted}`);
  }
}
