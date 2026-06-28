import { FrameworkViolationError } from "../../errors/FrameworkViolationError";
import { IAS2_IFRS, US_GAAP_ASC330 } from "./types";

export class InventoryDecompositionIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC330,
      detail,
      "ASC 330-10-50-1",
      "Inventories must disaggregate raw materials, work in process, and finished goods with costing method.",
    );
    this.name = "InventoryDecompositionIncompleteError";
  }
}

export class COGMRollforwardIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      US_GAAP_ASC330,
      detail,
      "ASC 330 COGM supplementary schedule",
      "Cost of goods manufactured rollforward must reconcile to income statement COGS.",
    );
    this.name = "COGMRollforwardIncompleteError";
  }
}

export class IAS2LIFOProhibitedError extends FrameworkViolationError {
  constructor() {
    super(
      IAS2_IFRS,
      "LIFO cost formula not permitted",
      "IAS 2.25",
      "Entity must declare FIFO or weighted-average for IFRS reporting. LIFO is permitted only under US GAAP (ASC 330).",
    );
    this.name = "IAS2LIFOProhibitedError";
  }
}

export class IAS2TerminologyError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IAS2_IFRS,
      detail,
      "IAS 2.36(b)",
      'Use "work in progress" terminology under IFRS, not US GAAP "work in process".',
    );
    this.name = "IAS2TerminologyError";
  }
}

export class Ias2InventoryDecompositionIncompleteError extends FrameworkViolationError {
  constructor(detail: string) {
    super(
      IAS2_IFRS,
      detail,
      "IAS 2.36(b)",
      "Inventories must classify raw materials, work in progress, and finished goods with permitted cost formula.",
    );
    this.name = "Ias2InventoryDecompositionIncompleteError";
  }
}
