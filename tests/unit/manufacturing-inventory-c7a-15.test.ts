import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/lanes/manufacturing/forbidden";
import {
  COGMRollforwardIncompleteError,
  IAS2LIFOProhibitedError,
  IAS2TerminologyError,
  InventoryDecompositionIncompleteError,
} from "../../lib/router/lanes/manufacturing/errors";
import { emitCogmRollforward } from "../../lib/router/lanes/manufacturing/emitters/cogmRollforward";
import { emitInventoryDecomposition } from "../../lib/router/lanes/manufacturing/emitters/inventoryDecomposition";
import { emitInventoryDecompositionIAS2 } from "../../lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2";
import {
  buildIas2EmitterInput,
  buildUsgaapAsc330EmitterInput,
} from "../../lib/router/lanes/manufacturing/types";
import {
  emitterSatisfiesAssertion,
  ifrsManufacturingInventoryOutputText,
  runManufacturingRouter,
  usgaapManufacturingInventoryOutputText,
} from "../../lib/router/manufacturing";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/manufacturing");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("manufacturing C7a-15 inventory ASC 330 + IAS 2", () => {
  it("inventoryDecomposition happy CAT-10k LIFO with reserve", () => {
    const extracted = loadFixture("inventory/happy-cat-10k-full.json");
    const output = usgaapManufacturingInventoryOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/raw materials/i);
    expect(output).toMatch(/work in process/i);
    expect(output).toMatch(/LIFO reserve/i);
    expect(emitterSatisfiesAssertion(runManufacturingRouter(extracted).results, "inventory-decomposition").satisfied).toBe(
      true,
    );
  });

  it("cogmRollforward happy CAT-10k reconciles COGS to income statement", () => {
    const extracted = loadFixture("inventory/happy-cat-10k-full.json");
    const output = usgaapManufacturingInventoryOutputText(extracted);
    expect(output).toMatch(/cost of goods manufactured/i);
    expect(output).toMatch(/reconciled to income statement COGS/i);
    expect(emitterSatisfiesAssertion(runManufacturingRouter(extracted).results, "cogm-rollforward").satisfied).toBe(true);
  });

  it("IFRS inventoryDecompositionIAS2 happy SIE-annual uses work in progress and NRV reversal", () => {
    const extracted = loadFixture("inventory/ifrs/happy-sie-annual-full.json");
    const output = ifrsManufacturingInventoryOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/work in progress/i);
    expect(output).not.toMatch(/work in process/i);
    expect(output).toMatch(/writedown reversal/i);
    expect(emitterSatisfiesAssertion(runManufacturingRouter(extracted).results, "inventory-decomposition").satisfied).toBe(
      true,
    );
  });

  it("rejects LIFO under IFRS with IAS2LIFOProhibitedError", () => {
    const extracted = loadFixture("inventory/ifrs/reject-lifo-under-ifrs.json");
    expect(() => emitInventoryDecompositionIAS2(buildIas2EmitterInput(extracted))).toThrow(IAS2LIFOProhibitedError);
  });

  it("rejects work_in_process field under IFRS with IAS2TerminologyError", () => {
    const extracted = loadFixture("inventory/ifrs/reject-work-in-process-ifrs.json");
    expect(() => emitInventoryDecompositionIAS2(buildIas2EmitterInput(extracted))).toThrow(IAS2TerminologyError);
  });

  it("rejects LIFO without reserve under US GAAP", () => {
    const extracted = loadFixture("inventory/reject-lifo-without-reserve.json");
    expect(() => emitInventoryDecomposition(buildUsgaapAsc330EmitterInput(extracted))).toThrow(
      InventoryDecompositionIncompleteError,
    );
  });

  it("rejects missing costing method under US GAAP", () => {
    const extracted = loadFixture("inventory/reject-missing-costing-method.json");
    expect(() => emitInventoryDecomposition(buildUsgaapAsc330EmitterInput(extracted))).toThrow(
      InventoryDecompositionIncompleteError,
    );
  });

  it("rejects COGS reconciliation mismatch above tolerance", () => {
    const extracted = loadFixture("inventory/reject-cogs-reconciliation-mismatch.json");
    expect(() => emitCogmRollforward(buildUsgaapAsc330EmitterInput(extracted))).toThrow(COGMRollforwardIncompleteError);
  });

  it("US GAAP framework rejects IAS 2 inventory inputs", () => {
    const extracted = loadFixture("inventory/framework-rejection-ias2-on-usgaap.json");
    const router = runManufacturingRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("ASC 330");
    expect(router.results.length).toBe(0);
  });

  it("cross-cutting MFG-10K-INVENTORY: US GAAP LIFO suite framework-pure", () => {
    const extracted = loadFixture("cross-cutting/MFG-10K-INVENTORY.json");
    const output = usgaapManufacturingInventoryOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/LIFO/);
    const router = runManufacturingRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied").length).toBe(2);
  });

  it("cross-cutting SIE-AR-INVENTORY: IFRS IAS 2 suite framework-pure", () => {
    const extracted = loadFixture("cross-cutting/SIE-AR-INVENTORY.json");
    const output = ifrsManufacturingInventoryOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/IAS 2/);
    const router = runManufacturingRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied").length).toBe(1);
  });

  it("cross-cutting framework-switch: MFG US GAAP vs SIE IFRS both framework-pure", () => {
    const us = loadFixture("cross-cutting/MFG-10K-INVENTORY.json");
    const ifrs = loadFixture("cross-cutting/SIE-AR-INVENTORY.json");
    expect(collectForbiddenMatches(usgaapManufacturingInventoryOutputText(us), USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsManufacturingInventoryOutputText(ifrs), IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });

  it("happy ETN, GE, HON fixtures satisfy inventory-decomposition and cogm-rollforward", () => {
    for (const fixture of [
      "inventory/happy-etn-10k-full.json",
      "inventory/happy-ge-10k-full.json",
      "inventory/happy-hon-10k-full.json",
    ]) {
      const extracted = loadFixture(fixture);
      const router = runManufacturingRouter(extracted);
      expect(emitterSatisfiesAssertion(router.results, "inventory-decomposition").satisfied).toBe(true);
      expect(emitterSatisfiesAssertion(router.results, "cogm-rollforward").satisfied).toBe(true);
    }
  });

  it("US GAAP emitters branch on US_GAAP_ASC330 framework gate", () => {
    for (const rel of [
      "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
      "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts",
    ]) {
      const source = readFileSync(join(import.meta.dirname, "../..", rel), "utf8");
      expect(source).toMatch(/US_GAAP_ASC330/);
    }
  });

  it("IFRS emitter branches on IAS2_IFRS framework gate", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../..", "lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2.ts"),
      "utf8",
    );
    expect(source).toMatch(/IAS2_IFRS/);
  });
});
