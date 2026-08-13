/**
 * Xero historical Aged Receivables (as-of) helpers.
 *
 * Official GET /Reports/AgedReceivablesByContact requires contactID and accepts
 * `date` which "shows payments up to this date" — the authoritative historical
 * open-balance source. Sync-time batching only; never from the UI.
 */

import type { CanonicalArOpenReceivable, CanonicalArLineProvenance } from "../accounting/ar-aging";
import { parseAmountOrZero } from "@/lib/parse/amount";

export type XeroAgedReportCell = {
  Value?: string;
  Attributes?: Array<{ Id?: string; Value?: string }>;
};

export type XeroAgedReportRow = {
  RowType?: string;
  Title?: string;
  Cells?: XeroAgedReportCell[];
  Rows?: XeroAgedReportRow[];
};

const HEADER_ALIASES: Record<string, string> = {
  date: "invoiceDate",
  reference: "reference",
  "due date": "dueDate",
  total: "total",
  paid: "paid",
  credited: "credited",
  due: "due",
};

function cellAttrId(cell: XeroAgedReportCell | undefined, id: string): string | null {
  const attrs = Array.isArray(cell?.Attributes) ? cell!.Attributes! : [];
  const match = attrs.find((a) => String(a.Id || "").toLowerCase() === id.toLowerCase());
  return match?.Value ? String(match.Value) : null;
}

function normalizeHeaderLabel(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function xeroDateToIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  const asString = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(asString)) return asString.slice(0, 10);
  const match = /\/Date\((-?\d+)/.exec(asString);
  if (match) {
    const date = new Date(Number(match[1]));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
  return null;
}

function walkRows(rows: XeroAgedReportRow[] = [], visit: (row: XeroAgedReportRow) => void) {
  for (const row of rows) {
    visit(row);
    if (Array.isArray(row.Rows) && row.Rows.length) walkRows(row.Rows, visit);
  }
}

/**
 * Parse one AgedReceivablesByContact report payload into open receivable lines
 * using the report's Due amount (payments/credits applied only up to `date`).
 */
export function parseXeroAgedReceivablesByContactReport(input: {
  reportRows: XeroAgedReportRow[];
  asOfDate: string;
  contactId: string;
  contactName: string;
  externalEntityId?: string;
}): CanonicalArOpenReceivable[] {
  let columnMap: Record<string, number> | null = null;
  const receivables: CanonicalArOpenReceivable[] = [];

  walkRows(input.reportRows, (row) => {
    if (row.RowType === "Header" && Array.isArray(row.Cells)) {
      columnMap = {};
      row.Cells.forEach((cell, index) => {
        const key = HEADER_ALIASES[normalizeHeaderLabel(cell?.Value)];
        if (key) columnMap![key] = index;
      });
      return;
    }
    if (row.RowType !== "Row" || !Array.isArray(row.Cells) || !columnMap) return;
    if (columnMap.due == null || columnMap.dueDate == null) return;

    const dueCell = row.Cells[columnMap.due];
    const dueDateCell = row.Cells[columnMap.dueDate];
    const dateCell = columnMap.invoiceDate != null ? row.Cells[columnMap.invoiceDate] : undefined;
    const openBalance = parseAmountOrZero(dueCell?.Value);
    if (!Number.isFinite(openBalance) || Math.abs(openBalance) <= 0.005) return;

    const dueDate = xeroDateToIso(dueDateCell?.Value);
    if (!dueDate) return;

    const invoiceId =
      cellAttrId(dueCell, "invoiceID") ||
      cellAttrId(dueDateCell, "invoiceID") ||
      cellAttrId(dateCell, "invoiceID") ||
      cellAttrId(row.Cells[0], "invoiceID") ||
      `${input.contactId}:${dueDate}:${openBalance}`;

    const provenance: CanonicalArLineProvenance = {
      provider: "xero",
      providerFamily: "xero",
      providerProduct: "xero",
      sourceReport: "AgedReceivablesByContact",
      externalEntityId: input.externalEntityId || input.contactId,
      externalRecordId: invoiceId,
      hierarchyPath: ["Aged Receivables", input.contactName],
      section: "Receivables",
      reportAmount: openBalance,
    };

    receivables.push({
      invoiceId,
      invoiceDate: xeroDateToIso(dateCell?.Value),
      dueDate,
      contactId: input.contactId,
      contactName: input.contactName,
      openBalance,
      currency: null,
      status: "AGED_AS_OF",
      provider: "xero",
      sourceKind: "aging_report_row",
      provenance,
    });
  });

  return receivables;
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export const XERO_AGED_RECEIVABLES_SYNC_CONCURRENCY = 3;
export const XERO_AGED_RECEIVABLES_MAX_CONTACTS = 500;
