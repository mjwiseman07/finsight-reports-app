import { FrameworkViolationError } from "../../errors/FrameworkViolationError";
import { IFRS_15, IFRS_9, US_GAAP_ASC606 } from "./types";

export class IPCMethodologyMissingError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC606,
      detail,
      "ASC 606-10-50-12",
      "Disclose portfolio or individual contract methodology for implicit price concession estimates.",
    );
    this.name = "IPCMethodologyMissingError";
  }
}

export class IPCBadDebtMislabelError extends FrameworkViolationError {
  constructor() {
    super(
      US_GAAP_ASC606,
      "bad debt expense language in IPC narrative",
      "ASU 2014-09 / ASC 606-10-32-7",
      "Implicit price concession is a reduction of revenue at contract inception, not bad-debt expense.",
    );
    this.name = "IPCBadDebtMislabelError";
  }
}

export class PreAsc606BadDebtModelError extends FrameworkViolationError {
  constructor(pct: number) {
    super(
      US_GAAP_ASC606,
      `residual bad-debt expense ${(pct * 100).toFixed(2)}% of net patient service revenue exceeds 5%`,
      "ASC 326 / ASC 606",
      "Post-ASC 606 residual bad-debt expense should be small; high ratio suggests pre-606 model.",
    );
    this.name = "PreAsc606BadDebtModelError";
  }
}

export class PayorMixIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC606,
      detail,
      "ASC 606-10-50-5",
      "Net patient service revenue must disaggregate by major payor class with footing to total.",
    );
    this.name = "PayorMixIncompleteError";
  }
}

export class IFRS9StageIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IFRS_9,
      detail,
      "IFRS 9.5.5",
      "Expected credit loss allowance must reconcile by stage 1, 2, and 3.",
    );
    this.name = "IFRS9StageIncompleteError";
  }
}

export class IFRS9ForwardLookingMissingError extends FrameworkViolationError {
  constructor() {
    super(
      IFRS_9,
      "forward-looking macroeconomic inputs not disclosed",
      "IFRS 9.5.5.17",
      "Disclose forward-looking macroeconomic scenarios used in ECL measurement.",
    );
    this.name = "IFRS9ForwardLookingMissingError";
  }
}

export class IfrsPayorMixIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IFRS_15,
      detail,
      "IFRS 15.114-115",
      "Revenue disaggregation must use jurisdiction-appropriate payor classes.",
    );
    this.name = "IfrsPayorMixIncompleteError";
  }
}

export class IfrsUsPayorCominglingError extends FrameworkViolationError {
  constructor(term: string) {
    super(
      IFRS_15,
      `US payor class term in IFRS lane: ${term}`,
      "IFRS 15.114",
      "Use jurisdiction-appropriate payor taxonomy (NHS, national insurance), not US Medicare/Medicaid.",
    );
    this.name = "IfrsUsPayorCominglingError";
  }
}
