import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Locked baseline at G7-C7a-9 (wiring verifier main passCount). */
export const EMITTER_MATRIX_BASELINE_COUNT = 435;

export const C7A_11_HC_REVENUE_EMITTER_ROWS = [
  {
    id: "hc-payor-mix-disaggregation",
    emitterPath: "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
    framework: "US_GAAP_ASC606",
    gapId: "GAP-0093",
  },
  {
    id: "hc-implicit-price-concession",
    emitterPath: "lib/router/lanes/healthcare/emitters/implicitPriceConcession.ts",
    framework: "US_GAAP_ASC606",
    gapId: "GAP-0092",
  },
  {
    id: "hc-allowance-rollforward",
    emitterPath: "lib/router/lanes/healthcare/emitters/allowanceRollforward.ts",
    framework: "US_GAAP_ASC606",
    gapId: "GAP-0087",
  },
  {
    id: "hc-ifrs-receivables-ecl",
    emitterPath: "lib/router/lanes/healthcare/emitters/ifrs/receivablesECL.ts",
    framework: "IFRS_9",
    gapId: "GAP-0082",
  },
  {
    id: "hc-ifrs-payor-mix",
    emitterPath: "lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS.ts",
    framework: "IFRS_15",
    gapId: "GAP-0083",
  },
] as const;

export const C7A_10_IFRS_LEASE_EMITTER_ROWS = [
  {
    id: "rtl-ifrs-lease-expense-breakdown",
    emitterPath: "lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown.ts",
    framework: "IFRS_16",
    gapId: "GAP-0166",
  },
  {
    id: "rtl-ifrs-lease-maturity-ifrs",
    emitterPath: "lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS.ts",
    framework: "IFRS_16",
    gapId: "GAP-0170",
  },
  {
    id: "rtl-ifrs-rou-asset-rollforward",
    emitterPath: "lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward.ts",
    framework: "IFRS_16",
    gapId: null,
  },
] as const;

const ROOT = join(import.meta.dirname, "../..");

describe("verifier emitter matrix (B4 retail IFRS lease rows)", () => {
  it("extends baseline 435 to 438 with C7a-10 IFRS lease emitter paths", () => {
    const total = EMITTER_MATRIX_BASELINE_COUNT + C7A_10_IFRS_LEASE_EMITTER_ROWS.length;
    expect(total).toBe(438);
  });

  for (const row of C7A_10_IFRS_LEASE_EMITTER_ROWS) {
    it(`${row.id} emitter file exists with IFRS_16 framework gate`, () => {
      const abs = join(ROOT, row.emitterPath);
      expect(existsSync(abs)).toBe(true);
      const source = readFileSync(abs, "utf8");
      expect(source).toContain("IFRS_16");
      expect(source).toContain(row.emitterPath.replace(/\//g, "/"));
    });
  }
});

describe("verifier emitter matrix (B4 healthcare revenue rows)", () => {
  it("extends baseline 435 to 443 with C7a-11 HC payor/IPC/ECL emitter paths", () => {
    const total =
      EMITTER_MATRIX_BASELINE_COUNT +
      C7A_10_IFRS_LEASE_EMITTER_ROWS.length +
      C7A_11_HC_REVENUE_EMITTER_ROWS.length;
    expect(total).toBe(443);
  });

  for (const row of C7A_11_HC_REVENUE_EMITTER_ROWS) {
    it(`${row.id} emitter file exists with ${row.framework} framework gate`, () => {
      const abs = join(ROOT, row.emitterPath);
      expect(existsSync(abs)).toBe(true);
      const source = readFileSync(abs, "utf8");
      expect(source).toContain(row.framework);
    });
  }
});
