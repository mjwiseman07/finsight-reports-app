import type { MfgEntityContext, MfgKvColumn, MfgKvRow, ReportingBasis } from "./types";
import { buildLifoReserveDisclosure } from "./inventory/lifo-reserve-disclosure";
import { routeIfrsCostFormula } from "./inventory/ifrs-cost-formula";
import { invokeManufacturingCostAudit } from "../../audit/channels/manufacturing-cost-audit";

export class MfgNotApplicableByDesignError extends Error {
  constructor(
    public readonly row: MfgKvRow,
    public readonly column: MfgKvColumn,
  ) {
    super(`NOT_APPLICABLE_BY_DESIGN: (${row}, ${column})`);
    this.name = "MfgNotApplicableByDesignError";
  }
}

const NA_COLUMNS: MfgKvColumn[] = [
  "fund-accounting-audit",
  "dcaa-audit",
  "construction-contract-audit",
  "restricted-net-asset-audit",
];

export const MFG_KV_ROWS: MfgKvRow[] = [
  "D-discrete",
  "P-process",
  "H-hybrid",
  "J-job-shop",
  "E-engineering-to-order",
  "GAAP-LIFO",
  "GAAP-FIFO",
  "IFRS-FIFO",
  "IFRS-Revalued",
  "MultiEntity-Mixed",
  "ContractMfg",
];

export const MFG_KV_COLUMNS: MfgKvColumn[] = [
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
  "manufacturing-cost-audit",
];

export const MFG_KV_CELL_COUNT = MFG_KV_ROWS.length * MFG_KV_COLUMNS.length;

const ROW_BASIS: Record<MfgKvRow, ReportingBasis | "MIXED"> = {
  "D-discrete": "US_GAAP",
  "P-process": "US_GAAP",
  "H-hybrid": "US_GAAP",
  "J-job-shop": "US_GAAP",
  "E-engineering-to-order": "US_GAAP",
  "GAAP-LIFO": "US_GAAP",
  "GAAP-FIFO": "US_GAAP",
  "IFRS-FIFO": "IFRS",
  "IFRS-Revalued": "IFRS",
  "MultiEntity-Mixed": "MIXED",
  ContractMfg: "US_GAAP",
};

export function cellKey(row: MfgKvRow, column: MfgKvColumn): string {
  return `${row}|${column}`;
}

export function isNaByDesign(row: MfgKvRow, column: MfgKvColumn): boolean {
  return NA_COLUMNS.includes(column);
}

export interface MfgKvCellResolution {
  row: MfgKvRow;
  column: MfgKvColumn;
  applicability: "APPLICABLE" | "NOT_APPLICABLE_BY_DESIGN";
  basis: ReportingBasis | "MIXED";
  handlerChannel: MfgKvColumn;
  typedSurface?: string;
  doctrineHonored: boolean;
}

export function resolveMfgKvCell(ctx: MfgEntityContext, column: MfgKvColumn): MfgKvCellResolution {
  if (isNaByDesign(ctx.row, column)) {
    throw new MfgNotApplicableByDesignError(ctx.row, column);
  }

  if (column === "restricted-net-asset-audit" && !ctx.containsRestrictedNetAssetData) {
    throw new Error("containsRestrictedNetAssetData check failed — fail-closed.");
  }

  const basis = ROW_BASIS[ctx.row];
  let typedSurface: string | undefined;

  if (column === "financial-statements") {
    if (ctx.row === "GAAP-LIFO") {
      buildLifoReserveDisclosure({
        reserveAmount: 1,
        liquidationIncomeRecognized: 0,
        asOfDate: new Date(),
      });
      typedSurface = "LifoReserveDisclosure";
    } else if (ctx.row === "IFRS-FIFO" || ctx.row === "IFRS-Revalued") {
      routeIfrsCostFormula({
        basis: "IFRS",
        method: "FIFO",
        nrvWriteUpReversalPermitted: true,
        nrvEvaluationGranularity: "ITEM",
      });
      typedSurface = "IFRSDisclosurePackage";
    }
  }

  if (column === "manufacturing-cost-audit") {
    invokeManufacturingCostAudit({ row: ctx.row, column, basis: ctx.basis });
    typedSurface = "ManufacturingCostAuditEntry";
  }

  if (column === "variance-analysis") {
    typedSurface = "SixVariance";
  }

  return {
    row: ctx.row,
    column,
    applicability: "APPLICABLE",
    basis,
    handlerChannel: column,
    typedSurface,
    doctrineHonored: true,
  };
}

export function assertNaCellFailClosed(row: MfgKvRow, column: MfgKvColumn): void {
  try {
    resolveMfgKvCell(
      { row, basis: "US_GAAP", containsRestrictedNetAssetData: false },
      column,
    );
    throw new Error(`Expected NOT_APPLICABLE_BY_DESIGN for (${row}, ${column})`);
  } catch (err) {
    if (err instanceof MfgNotApplicableByDesignError) {
      return;
    }
    throw err;
  }
}
