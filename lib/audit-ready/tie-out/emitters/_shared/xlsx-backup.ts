import * as XLSX from "xlsx";
import type { BackupTabSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { centsToDollars } from "./format";

function cellValue(
  key: string,
  raw: string | number | null | undefined,
  format?: "currency" | "date" | "text" | "number",
): string | number {
  if (raw === null || raw === undefined) return "";
  if (format === "currency" && typeof raw === "number") {
    return centsToDollars(raw);
  }
  return raw;
}

export function buildBackupSheet(tab: BackupTabSpec): XLSX.WorkSheet {
  const header = tab.columns.map((c) => c.label);
  const body = tab.rows.map((row) =>
    tab.columns.map((c) => cellValue(c.key, row[c.key], c.format)),
  );
  const subtotal = tab.subtotalRow
    ? [
        tab.columns.map((c) =>
          cellValue(c.key, tab.subtotalRow![c.key], c.format),
        ),
      ]
    : [];
  const ws = XLSX.utils.aoa_to_sheet([header, ...body, ...subtotal]);
  ws["!cols"] = tab.columns.map((c) => ({
    wch: Math.max(12, c.label.length + 2),
  }));
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let R = 1; R <= range.e.r; R++) {
    tab.columns.forEach((col, C) => {
      if (col.format !== "currency") return;
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[ref] && typeof ws[ref].v === "number") {
        ws[ref].z = "$#,##0.00;[Red]($#,##0.00)";
      }
    });
  }
  return ws;
}

/** Excel sheet names max 31 chars and cannot contain \\ / ? * [ ]. */
export function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, "-").trim() || "Sheet";
  return cleaned.slice(0, 31);
}
