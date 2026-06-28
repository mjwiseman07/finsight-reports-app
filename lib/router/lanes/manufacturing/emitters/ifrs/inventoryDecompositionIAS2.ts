import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import {
  IAS2LIFOProhibitedError,
  IAS2TerminologyError,
  Ias2InventoryDecompositionIncompleteError,
} from "../../errors";
import { assertIfrsMfgInventoryOutputNonComingling } from "../../forbidden";
import {
  IAS2_IFRS,
  isLifoCostingMethod,
  MFG_FOOTING_TOLERANCE_USD,
  type ManufacturingInventoryEmitterInput,
} from "../../types";

export const EMITTER_PATH =
  "lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2.ts";

const CITATION: EmitterCitation = {
  standard: "IAS 2",
  paragraphs: ["25", "33", "34", "36(b)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: ManufacturingInventoryEmitterInput): void {
  if (input.framework !== IAS2_IFRS) {
    throw new Ias2InventoryDecompositionIncompleteError("framework gate");
  }
}

export function emitInventoryDecompositionIAS2(input: ManufacturingInventoryEmitterInput): EmitterResult {
  assertFramework(input);
  const raw = input.extracted.manufacturing_inventory?.ias2?.decomposition;
  if (!raw) {
    throw new Ias2InventoryDecompositionIncompleteError("manufacturing_inventory.ias2.decomposition");
  }

  const decomp = raw as typeof raw & { work_in_process?: number };
  if (decomp.work_in_process !== undefined) {
    throw new IAS2TerminologyError("work_in_process field not permitted under IAS 2");
  }

  if (
    decomp.raw_materials === undefined ||
    decomp.work_in_progress === undefined ||
    decomp.finished_goods === undefined
  ) {
    throw new Ias2InventoryDecompositionIncompleteError("missing raw materials, work in progress, or finished goods");
  }
  if (!decomp.costing_method) {
    throw new Ias2InventoryDecompositionIncompleteError("costing method not disclosed");
  }
  if (isLifoCostingMethod(decomp.costing_method)) {
    throw new IAS2LIFOProhibitedError();
  }
  if (decomp.costing_method !== "FIFO" && decomp.costing_method !== "weighted_average") {
    throw new Ias2InventoryDecompositionIncompleteError("costing method must be FIFO or weighted-average");
  }

  const merchandise = decomp.merchandise ?? 0;
  const computedTotal = decomp.raw_materials + decomp.work_in_progress + decomp.finished_goods + merchandise;
  if (Math.abs(computedTotal - decomp.total_inventories) > MFG_FOOTING_TOLERANCE_USD) {
    throw new Ias2InventoryDecompositionIncompleteError("inventory decomposition footing");
  }

  const methodLabel = decomp.costing_method === "FIFO" ? "FIFO" : "weighted-average";
  const nrvParts: string[] = [];
  if (decomp.nrv_writedown && decomp.nrv_writedown > 0) {
    nrvParts.push(`NRV writedown $${decomp.nrv_writedown.toLocaleString("en-US")} per IAS 2.34`);
  }
  if (decomp.nrv_writedown_reversal && decomp.nrv_writedown_reversal > 0) {
    nrvParts.push(
      `NRV writedown reversal $${decomp.nrv_writedown_reversal.toLocaleString("en-US")} per IAS 2.33`,
    );
  }
  const nrv = nrvParts.length > 0 ? ` ${nrvParts.join("; ")}.` : "";

  const text =
    `Inventories classified per ${CITATION_RESOLVED}: raw materials $${decomp.raw_materials.toLocaleString("en-US")}, ` +
    `work in progress $${decomp.work_in_progress.toLocaleString("en-US")}, finished goods $${decomp.finished_goods.toLocaleString("en-US")}` +
    (merchandise > 0 ? `, merchandise $${merchandise.toLocaleString("en-US")}` : "") +
    `. Total inventories $${decomp.total_inventories.toLocaleString("en-US")}. ` +
    `Cost formula: ${methodLabel} (IAS 2.25).${nrv}`;
  assertIfrsMfgInventoryOutputNonComingling(text);

  return {
    emitterId: "inventory-decomposition-ias2",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "inventory-decomposition", citation: CITATION, text }],
  };
}
