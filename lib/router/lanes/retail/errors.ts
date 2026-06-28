import { FrameworkViolationError } from "../../errors/FrameworkViolationError";
import { IFRS_16, US_GAAP_ASC842 } from "./types";

export class LeaseCostIncompleteError extends FrameworkViolationError {
  constructor(missingField: string) {
    super(
      US_GAAP_ASC842,
      `incomplete lease cost input: ${missingField}`,
      "ASC 842-20-50-4",
      "Provide operating lease cost, variable lease cost, short-term lease cost, and total lease cost (sublease income if any).",
    );
    this.name = "LeaseCostIncompleteError";
  }
}

export class LeaseWeightedAveragesInvalidError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC842,
      detail,
      "ASC 842-20-50-4(g)",
      "Weighted-average remaining lease term and discount rate must be within sanity bands for operating and finance leases.",
    );
    this.name = "LeaseWeightedAveragesInvalidError";
  }
}

export class LeaseMaturityReconciliationError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC842,
      detail,
      "ASC 842-20-50-6",
      "Undiscounted lease maturities must foot to present value and reconcile to balance sheet lease liabilities within $1.",
    );
    this.name = "LeaseMaturityReconciliationError";
  }
}

export class IFRS16ExpenseIncompleteError extends FrameworkViolationError {
  constructor(missingField: string) {
    super(
      IFRS_16,
      `incomplete IFRS 16 lease expense input: ${missingField}`,
      "IFRS 16.53",
      "Provide depreciation by class, interest, short-term, low-value, and variable lease payments separately per IFRS 16.53(a)-(e).",
    );
    this.name = "IFRS16ExpenseIncompleteError";
  }
}

export class IFRS16MaturityIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IFRS_16,
      detail,
      "IFRS 16.58 / IFRS 7.39",
      "Maturity analysis must use IFRS 7 time bands and reconcile undiscounted flows to lease liability carrying amount.",
    );
    this.name = "IFRS16MaturityIncompleteError";
  }
}

export class IFRS16RoURollforwardError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IFRS_16,
      detail,
      "IFRS 16.53(j)",
      "Right-of-use asset rollforward requires distinct asset classes and reconciliation to balance sheet RoU total.",
    );
    this.name = "IFRS16RoURollforwardError";
  }
}
