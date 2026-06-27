import { describe, expect, it } from "vitest";
import {
  MFG_KV_COLUMNS,
  MFG_KV_ROWS,
  MfgNotApplicableByDesignError,
  assertNaCellFailClosed,
  isNaByDesign,
  resolveMfgKvCell,
} from "../../../src/verticals/manufacturing/kv-matrix";
import type { MfgEntityContext, MfgKvColumn, MfgKvRow } from "../../../src/verticals/manufacturing/types";
import { MFG_AUDIT_CHANNEL_COUNT } from "../../../src/audit/channel-registry";
import { manufacturingCostAuditHandler } from "../../../src/audit/channels/manufacturing-cost-audit";

function ctxForRow(row: MfgKvRow): MfgEntityContext {
  const basis =
    row === "IFRS-FIFO" || row === "IFRS-Revalued"
      ? "IFRS"
      : row === "MultiEntity-Mixed"
        ? "US_GAAP"
        : "US_GAAP";
  return {
    row,
    basis,
    containsRestrictedNetAssetData: false,
  };
}

describe("MFG-2 K-V matrix (132 cells)", () => {
  for (const row of MFG_KV_ROWS) {
    for (const column of MFG_KV_COLUMNS) {
      it(`cell ${row} × ${column}`, () => {
        const ctx = ctxForRow(row);
        if (isNaByDesign(row, column)) {
          expect(() => resolveMfgKvCell(ctx, column)).toThrow(MfgNotApplicableByDesignError);
          assertNaCellFailClosed(row, column);
          return;
        }

        const resolution = resolveMfgKvCell(ctx, column);
        expect(resolution.applicability).toBe("APPLICABLE");
        expect(resolution.handlerChannel).toBe(column);
        expect(resolution.doctrineHonored).toBe(true);

        if (column === "manufacturing-cost-audit") {
          expect(manufacturingCostAuditHandler.channel).toBe("manufacturing-cost-audit");
          expect(manufacturingCostAuditHandler.invoke().status).toBe("structural");
        }
      });
    }
  }
});
