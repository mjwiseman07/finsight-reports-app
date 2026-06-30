import { CrossoverViolationError } from "./errors";

export class CharityCareNfpReconciliationError extends CrossoverViolationError {
  constructor(detail: string) {
    super("hc-npo:charity-care-nfp-reconciliation", detail);
    this.name = "CharityCareNfpReconciliationError";
  }
}
export class Reit90HotelInclusionError extends CrossoverViolationError {
  constructor(detail: string) {
    super("re-hos:reit-90-hotel-inclusion", detail);
    this.name = "Reit90HotelInclusionError";
  }
}
export class LessorLesseeDualityError extends CrossoverViolationError {
  constructor(detail: string) {
    super("re-hos:lessor-lessee-duality", detail);
    this.name = "LessorLesseeDualityError";
  }
}
export class CeclScopeMismatchError extends CrossoverViolationError {
  constructor(detail: string) {
    super("bank-ins:cecl-scope", detail);
    this.name = "CeclScopeMismatchError";
  }
}
export class LaneComminglingAcrossEntitiesError extends CrossoverViolationError {
  constructor(detail: string) {
    super("bank-ins:lane-commingling-across-entities", detail);
    this.name = "LaneComminglingAcrossEntitiesError";
  }
}
export class CapitalAdequacyDoubleCountError extends CrossoverViolationError {
  constructor(detail: string) {
    super("bank-ins:capital-double-count", detail);
    this.name = "CapitalAdequacyDoubleCountError";
  }
}
export class NavReservesReconciliationError extends CrossoverViolationError {
  constructor(detail: string) {
    super("fa-ins:nav-reserves-reconciliation", detail);
    this.name = "NavReservesReconciliationError";
  }
}
export class IlsContractBoundaryError extends CrossoverViolationError {
  constructor(detail: string) {
    super("fa-ins:ils-contract-boundary", detail);
    this.name = "IlsContractBoundaryError";
  }
}
