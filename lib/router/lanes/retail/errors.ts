import { FrameworkViolationError } from "../../errors/FrameworkViolationError";
import { US_GAAP_ASC842 } from "./types";

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
