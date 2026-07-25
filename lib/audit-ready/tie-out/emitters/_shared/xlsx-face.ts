import * as XLSX from "xlsx";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { centsToDollars, centsToUsd, formatIsoDate } from "./format";

const REPORT_ONLY_NOTE =
  "Report-only — no GL comparison. Kickouts flagged from data quality (aging, credit balances, negative qty).";

export function buildFaceSheet(face: ReconFaceSpec): XLSX.WorkSheet {
  const isReportOnly = face.mode === "report_only";
  const rows: Array<Array<string | number>> = [
    ["Engagement", face.engagementName],
    ["Period End", formatIsoDate(face.periodEnd)],
    [],
  ];

  if (isReportOnly) {
    rows.push([`Per ${face.leftLabel}:`, centsToDollars(face.leftAmountCents)]);
    rows.push(["Basis", "REPORT"]);
    rows.push([]);
    rows.push([REPORT_ONLY_NOTE]);
  } else {
    rows.push([`Per ${face.leftLabel}:`, centsToDollars(face.leftAmountCents)]);
    rows.push([
      `Per ${face.rightLabel ?? "General Ledger"}:`,
      centsToDollars(face.rightAmountCents ?? 0),
    ]);
    rows.push([
      "Variance:",
      centsToDollars(face.varianceCents ?? 0),
      face.tieStatus === "ties" ? "TIES" : "KICKOUT",
    ]);
  }

  rows.push([]);
  rows.push(["Sections", "Amount", "Backup Tab"]);
  const sectionStartRow = rows.length;
  for (const s of face.sections) {
    rows.push([s.label, centsToDollars(s.amountCents), s.backupTabName]);
  }
  rows.push([]);
  if (!isReportOnly) {
    rows.push(["Variance (display)", centsToUsd(face.varianceCents ?? 0)]);
  }
  rows.push(["Tolerance (cents)", face.toleranceCents]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 44 }, { wch: 18 }, { wch: 28 }];
  // Currency format on the left/right/variance amount cells (rows 4-6, col B).
  for (const ref of ["B4", "B5", "B6"]) {
    if (ws[ref] && typeof ws[ref].v === "number") {
      ws[ref].z = "$#,##0.00;[Red]($#,##0.00)";
    }
  }
  for (let i = 0; i < face.sections.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: sectionStartRow + i, c: 1 });
    if (ws[ref] && typeof ws[ref].v === "number") {
      ws[ref].z = "$#,##0.00;[Red]($#,##0.00)";
    }
  }
  return ws;
}
