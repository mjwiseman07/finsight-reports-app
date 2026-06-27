import { describe, expect, it } from "vitest";
import {
  RTL_KV_CHANNELS,
  RTL_KV_ROWS,
  evaluateRetailKv,
} from "../../../src/verticals/retail/kpi/evaluator";

describe("RTL-2 K-V 132-cell matrix", () => {
  for (const row of RTL_KV_ROWS) {
    for (const channel of RTL_KV_CHANNELS) {
      it(`(${row}, ${channel})`, () => {
        const result = evaluateRetailKv(row, channel);
        expect(["APPLICABLE", "NOT_APPLICABLE_BY_DESIGN"]).toContain(result.status);

        if (
          channel === "dcaa-audit" ||
          channel === "construction-contract-audit" ||
          channel === "fund-accounting-audit" ||
          channel === "restricted-net-asset-audit" ||
          channel === "manufacturing-cost-audit"
        ) {
          expect(result.status).toBe("NOT_APPLICABLE_BY_DESIGN");
          expect(result.reason).toBeTruthy();
          return;
        }

        if (row === "MarketplaceAgent" && channel === "variance-analysis") {
          expect(result.status).toBe("NOT_APPLICABLE_BY_DESIGN");
          return;
        }

        expect(result.status).toBe("APPLICABLE");
      });
    }
  }
});
