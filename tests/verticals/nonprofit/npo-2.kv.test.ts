import { describe, expect, it } from "vitest";
import {
  NPO_KV_COLUMNS,
  NPO_KV_ROWS,
  NotApplicableByDesignError,
  assertNaCellFailClosed,
  isNaByDesign,
  resolveKvCell,
} from "../../../src/verticals/nonprofit/kv-matrix";
import type { EntityDoctrineProfile, NpoKvColumn, NpoKvRow } from "../../../src/verticals/nonprofit/types";
import {
  invokeAuditChannelForCell,
  invokeRestrictedNetAssetAudit,
} from "../../../src/audit/channels/restricted-net-asset-audit";
import { NPO_CITATION_HANDLE_COUNT } from "../../../src/verticals/nonprofit/citations";

const doctrine: EntityDoctrineProfile = {
  containsPHI: false,
  containsFedFunds: true,
  containsClassifiedData: false,
  containsControlledUnclassified: false,
  containsExportControlled: false,
  containsCardData: false,
  containsCriticalInfra: false,
  containsRestrictedNetAssetData: true,
};

function cellId(row: NpoKvRow, column: NpoKvColumn): string {
  return `${row} × ${column}`;
}

describe("NPO-2 K-V matrix (121 cells)", () => {
  for (const row of NPO_KV_ROWS) {
    for (const column of NPO_KV_COLUMNS) {
      it(`cell ${cellId(row, column)}`, () => {
        if (isNaByDesign(row, column)) {
          expect(() => resolveKvCell(row, column, doctrine)).toThrow(NotApplicableByDesignError);
          assertNaCellFailClosed(row, column);
          const na = invokeAuditChannelForCell({ row, column, doctrine });
          expect(na.applicability).toBe("NOT_APPLICABLE_BY_DESIGN");
          return;
        }

        const resolution = resolveKvCell(row, column, doctrine);
        expect(resolution.applicability).toBe("APPLICABLE");
        expect(resolution.handlerChannel).toBe(column);
        expect(resolution.citationHandleCount).toBe(NPO_CITATION_HANDLE_COUNT);
        expect(resolution.doctrineHonored).toBe(true);

        const invoked = invokeAuditChannelForCell({ row, column, doctrine });
        expect(invoked.applicability).toBe("APPLICABLE");

        if (column === "restricted-net-asset-audit") {
          const audit = invokeRestrictedNetAssetAudit({ row, column, doctrine });
          expect(audit.applicability).toBe("APPLICABLE");
        }
      });
    }
  }
});
