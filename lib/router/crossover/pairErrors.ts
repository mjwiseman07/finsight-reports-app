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

// === Wave 2 — Tier 2 pair errors ===

export class HcEduGrantClassificationError extends CrossoverViolationError {
  constructor(detail: string) {
    super("hc-edu:medical-research-grant-classification", detail);
    this.name = "HcEduGrantClassificationError";
  }
}

export class HcEduTuitionCharityThresholdError extends CrossoverViolationError {
  constructor(detail: string) {
    super("hc-edu:tuition-charity-threshold", detail);
    this.name = "HcEduTuitionCharityThresholdError";
  }
}

export class HcEduSchedule990ReferenceError extends CrossoverViolationError {
  constructor(detail: string) {
    super("hc-edu:form-990-schedule-h-e-reference", detail);
    this.name = "HcEduSchedule990ReferenceError";
  }
}

export class HcEduEndowmentComminglingError extends CrossoverViolationError {
  constructor(detail: string) {
    super("hc-edu:endowment-segregation", detail);
    this.name = "HcEduEndowmentComminglingError";
  }
}

export class MfgRtlInventoryComminglingError extends CrossoverViolationError {
  constructor(detail: string) {
    super("mfg-rtl:inventory-decomposition", detail);
    this.name = "MfgRtlInventoryComminglingError";
  }
}

export class MfgRtlMarginMethodError extends CrossoverViolationError {
  constructor(detail: string) {
    super("mfg-rtl:margin-method-consistency", detail);
    this.name = "MfgRtlMarginMethodError";
  }
}

export class MfgRtlLeaseDualityError extends CrossoverViolationError {
  constructor(detail: string) {
    super("mfg-rtl:lease-portfolio-duality", detail);
    this.name = "MfgRtlLeaseDualityError";
  }
}

export class MfgRtlSegmentBoundaryError extends CrossoverViolationError {
  constructor(detail: string) {
    super("mfg-rtl:segment-boundary", detail);
    this.name = "MfgRtlSegmentBoundaryError";
  }
}

export class ConReClassificationError extends CrossoverViolationError {
  constructor(detail: string) {
    super("con-re:held-for-sale-vs-investment", detail);
    this.name = "ConReClassificationError";
  }
}

export class ConReContractMethodError extends CrossoverViolationError {
  constructor(detail: string) {
    super("con-re:poc-vs-completed-contract", detail);
    this.name = "ConReContractMethodError";
  }
}

export class ConReCapitalizationCutoverError extends CrossoverViolationError {
  constructor(detail: string) {
    super("con-re:capitalization-cutover", detail);
    this.name = "ConReCapitalizationCutoverError";
  }
}

export class ConReBuildToRentLessorError extends CrossoverViolationError {
  constructor(detail: string) {
    super("con-re:build-to-rent-lessor", detail);
    this.name = "ConReBuildToRentLessorError";
  }
}
