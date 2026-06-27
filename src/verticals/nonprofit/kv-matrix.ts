import type { EntityDoctrineProfile, NpoKvColumn, NpoKvRow } from "./types";
import { NPO_CITATION_HANDLE_COUNT } from "./citations";

export class NotApplicableByDesignError extends Error {
  constructor(
    public readonly row: NpoKvRow,
    public readonly column: NpoKvColumn,
  ) {
    super(`NOT_APPLICABLE_BY_DESIGN: (${row}, ${column})`);
    this.name = "NotApplicableByDesignError";
  }
}

const NA_BY_DESIGN = new Set<string>([
  "R|dcaa-audit",
  "R|construction-contract-audit",
  "IPSAS_47_48|dcaa-audit",
  "IPSAS_23_legacy|dcaa-audit",
  "IPSAS_47_48|construction-contract-audit",
  "IPSAS_23_legacy|construction-contract-audit",
  "P-N-EZ|fund-accounting-audit",
  "A1|restricted-net-asset-audit",
  "A2|restricted-net-asset-audit",
]);

export const NPO_KV_ROWS: NpoKvRow[] = [
  "P-FULL",
  "P-N-EZ",
  "F",
  "H-healthcare",
  "H-higher-ed",
  "R",
  "A1",
  "A2",
  "IPSAS_47_48",
  "IPSAS_23_legacy",
  "UG_routed",
];

export const NPO_KV_COLUMNS: NpoKvColumn[] = [
  "revenue-recognition",
  "journal-entry-prep",
  "reconciliation",
  "variance-analysis",
  "close-management",
  "financial-statements",
  "audit-support",
  "fund-accounting-audit",
  "dcaa-audit",
  "construction-contract-audit",
  "restricted-net-asset-audit",
];

export function cellKey(row: NpoKvRow, column: NpoKvColumn): string {
  return `${row}|${column}`;
}

export function isNaByDesign(row: NpoKvRow, column: NpoKvColumn): boolean {
  return NA_BY_DESIGN.has(cellKey(row, column));
}

export interface KvCellResolution {
  row: NpoKvRow;
  column: NpoKvColumn;
  applicability: "APPLICABLE" | "NOT_APPLICABLE_BY_DESIGN";
  handlerChannel: NpoKvColumn;
  citationHandleCount: number;
  doctrineHonored: boolean;
}

export function resolveKvCell(
  row: NpoKvRow,
  column: NpoKvColumn,
  doctrine: EntityDoctrineProfile,
): KvCellResolution {
  if (isNaByDesign(row, column)) {
    throw new NotApplicableByDesignError(row, column);
  }

  const requiresRestricted =
    column === "restricted-net-asset-audit" ||
    row.startsWith("H-") ||
    row === "F" ||
    row === "P-FULL";

  if (requiresRestricted && !doctrine.containsRestrictedNetAssetData) {
    throw new Error(
      `containsRestrictedNetAssetData required for (${row}, ${column}) — fail-closed.`,
    );
  }

  return {
    row,
    column,
    applicability: "APPLICABLE",
    handlerChannel: column,
    citationHandleCount: NPO_CITATION_HANDLE_COUNT,
    doctrineHonored: true,
  };
}

export function assertNaCellFailClosed(row: NpoKvRow, column: NpoKvColumn): void {
  try {
    resolveKvCell(row, column, {
      containsPHI: false,
      containsFedFunds: false,
      containsClassifiedData: false,
      containsControlledUnclassified: false,
      containsExportControlled: false,
      containsCardData: false,
      containsCriticalInfra: false,
      containsRestrictedNetAssetData: true,
    });
    throw new Error(`Expected NOT_APPLICABLE_BY_DESIGN for (${row}, ${column})`);
  } catch (err) {
    if (err instanceof NotApplicableByDesignError) {
      return;
    }
    throw err;
  }
}
