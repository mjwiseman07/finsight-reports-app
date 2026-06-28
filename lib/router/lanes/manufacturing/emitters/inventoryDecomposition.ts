import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { InventoryDecompositionIncompleteError } from "../errors";
import { assertUsgaapMfgInventoryOutputNonComingling } from "../forbidden";
import {
  MFG_FOOTING_TOLERANCE_USD,
  US_GAAP_ASC330,
  type ManufacturingInventoryEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 330",
  paragraphs: ["330-10-50-1", "330-10-50-4", "330-10-35-1B"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

const COSTING_LABELS: Record<string, string> = {
  FIFO: "FIFO",
  LIFO: "LIFO",
  weighted_average: "weighted-average",
  specific_identification: "specific identification",
};

function assertFramework(input: ManufacturingInventoryEmitterInput): void {
  if (input.framework !== US_GAAP_ASC330) {
    throw new InventoryDecompositionIncompleteError("framework gate");
  }
}

export function emitInventoryDecomposition(input: ManufacturingInventoryEmitterInput): EmitterResult {
  assertFramework(input);
  const decomp = input.extracted.manufacturing_inventory?.asc330?.decomposition;
  if (!decomp) {
    throw new InventoryDecompositionIncompleteError("manufacturing_inventory.asc330.decomposition");
  }
  if (
    decomp.raw_materials === undefined ||
    decomp.work_in_process === undefined ||
    decomp.finished_goods === undefined
  ) {
    throw new InventoryDecompositionIncompleteError("missing raw materials, WIP, or finished goods");
  }
  if (!decomp.costing_method) {
    throw new InventoryDecompositionIncompleteError("costing method not disclosed");
  }

  const supplies = decomp.supplies ?? 0;
  const computedTotal = decomp.raw_materials + decomp.work_in_process + decomp.finished_goods + supplies;
  if (Math.abs(computedTotal - decomp.total_inventories) > MFG_FOOTING_TOLERANCE_USD) {
    throw new InventoryDecompositionIncompleteError("inventory decomposition footing");
  }

  if (decomp.costing_method === "LIFO" && (decomp.lifo_reserve === undefined || decomp.lifo_reserve <= 0)) {
    throw new InventoryDecompositionIncompleteError("LIFO declared but LIFO reserve missing");
  }

  const methodLabel = COSTING_LABELS[decomp.costing_method] ?? decomp.costing_method;
  const lcm =
    decomp.lcm_writedown && decomp.lcm_writedown > 0
      ? ` Lower-of-cost-or-net-realizable-value writedown $${decomp.lcm_writedown.toLocaleString("en-US")}.`
      : "";
  const lifo =
    decomp.costing_method === "LIFO" && decomp.lifo_reserve
      ? ` LIFO reserve $${decomp.lifo_reserve.toLocaleString("en-US")} per ASC 330-10-50-4.`
      : "";

  const text =
    `Inventories disaggregated per ${CITATION_RESOLVED}: raw materials $${decomp.raw_materials.toLocaleString("en-US")}, ` +
    `work in process $${decomp.work_in_process.toLocaleString("en-US")}, finished goods $${decomp.finished_goods.toLocaleString("en-US")}` +
    (supplies > 0 ? `, supplies $${supplies.toLocaleString("en-US")}` : "") +
    `. Total inventories $${decomp.total_inventories.toLocaleString("en-US")}. ` +
    `Costing method: ${methodLabel}.${lifo}${lcm}`;
  assertUsgaapMfgInventoryOutputNonComingling(text);

  return {
    emitterId: "inventory-decomposition",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "inventory-decomposition", citation: CITATION, text }],
  };
}
