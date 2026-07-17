import { describe, expect, it } from "vitest";
import { emitInventoryDecompositionIAS2 } from "@/lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2";
import { IAS2_IFRS } from "@/lib/router/lanes/manufacturing/types";

function emitDecomposition(
  overrides: Record<string, number | string | undefined> = {},
) {
  return emitInventoryDecompositionIAS2({
    framework: IAS2_IFRS,
    extracted: {
      framework: "ifrs" as const,
      manufacturing_inventory: {
        ias2: {
          decomposition: {
            raw_materials: 100_000,
            work_in_progress: 50_000,
            finished_goods: 200_000,
            total_inventories: 350_000,
            costing_method: "FIFO",
            ...overrides,
          },
        },
      },
    } as any,
  }).lines[0].text;
}

describe("manufacturing IAS 2 emitter — currency-aware formatting (MC-2b.2)", () => {
  it("emits CAD when presentation_currency=CAD", () => {
    const text = emitDecomposition({ presentation_currency: "CAD" });
    expect(text).toContain("CAD");
    expect(text).toMatch(/raw materials 100,000 CAD/);
  });

  it("no longer emits '$' prefix (previously hardcoded)", () => {
    const text = emitDecomposition({ presentation_currency: "USD" });
    expect(text).not.toContain("$100,000");
    expect(text).not.toContain("$50,000");
    expect(text).not.toContain("$200,000");
    expect(text).not.toContain("$350,000");
    expect(text).toMatch(/raw materials 100,000 USD/);
  });

  it("NRV writedown lines also use the currency-aware formatter", () => {
    const text = emitDecomposition({
      nrv_writedown: 5_000,
      nrv_writedown_reversal: 1_000,
      presentation_currency: "CAD",
    });

    expect(text).toMatch(/NRV writedown 5,000 CAD per IAS 2\.34/);
    expect(text).toMatch(/NRV writedown reversal 1,000 CAD per IAS 2\.33/);
    expect(text).not.toContain("$5,000");
    expect(text).not.toContain("$1,000");
  });
});
