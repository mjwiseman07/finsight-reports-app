import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { FrameworkViolationError } from "../../errors/FrameworkViolationError";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsRtlOutputNonComingling } from "../forbidden";
import { getCostFormula, hasCarryingAmounts, type RetailEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/retail/ifrs/inventoryMethodDeclaration.ts";

const CITATION: EmitterCitation = {
  standard: "IAS 2",
  paragraphs: ["25", "36"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitInventoryMethodDeclaration(input: RetailEmitterInput): EmitterResult {
  const { extracted } = input;
  const formula = getCostFormula(extracted);
  if (!formula) {
    throw new MissingDisclosureInputError("inventory.cost_formula");
  }

  if (formula.toUpperCase() === "LIFO" || formula === "LIFO") {
    throw new FrameworkViolationError(
      "IFRS",
      "LIFO cost formula not permitted",
      "IAS 2.25",
      "Entity must declare cost_formula as FIFO or weighted_average for IFRS reporting. LIFO is permitted only under US GAAP (ASC 330).",
    );
  }

  if (formula !== "FIFO" && formula !== "weighted_average") {
    throw new MissingDisclosureInputError("inventory.cost_formula");
  }

  if (!hasCarryingAmounts(extracted)) {
    throw new MissingDisclosureInputError("inventory.carrying_amounts");
  }

  const amounts = extracted.inventory!.carrying_amounts!;
  const summary = Object.entries(amounts)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
  const label = formula === "FIFO" ? "FIFO" : "weighted-average";
  const text = `Inventory accounted for using ${label} cost formula with carrying amounts (${summary}) per ${CITATION_RESOLVED}.`;
  assertIfrsRtlOutputNonComingling(text);

  return {
    emitterId: "inventory-method-declaration",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "inventory-method-declared", citation: CITATION, text }],
  };
}
