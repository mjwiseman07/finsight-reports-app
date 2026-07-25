import * as XLSX from "xlsx";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { centsToDollars, centsToUsd, formatIsoDate } from "./format";

export function buildFaceSheet(face: ReconFaceSpec): XLSX.WorkSheet {
  const rows: Array<Array<string | number>> = [
    ["Engagement", face.engagementName],
    ["Period End", formatIsoDate(face.periodEnd)],
    [],
    [`Per ${face.leftLabel}:`, centsToDollars(face.leftAmountCents)],
    [`Per ${face.rightLabel}:`, centsToDollars(face.rightAmountCents)],
    [
      "Variance:",
      centsToDollars(face.varianceCents),
      face.tieStatus === "ties" ? "TIES" : "KICKOUT",
    ],
    [],
    ["Sections", "Amount", "Backup Tab"],
    ...face.sections.map((s) => [
      s.label,
      centsToDollars(s.amountCents),
      s.backupTabName,
    ]),
    [],
    ["Variance (display)", centsToUsd(face.varianceCents)],
    ["Tolerance (cents)", face.toleranceCents],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 28 }];
  for (const ref of ["B4", "B5", "B6"]) {
    if (ws[ref] && typeof ws[ref].v === "number") {
      ws[ref].z = "$#,##0.00;[Red]($#,##0.00)";
    }
  }
  for (let i = 0; i < face.sections.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: 8 + i, c: 1 });
    if (ws[ref] && typeof ws[ref].v === "number") {
      ws[ref].z = "$#,##0.00;[Red]($#,##0.00)";
    }
  }
  return ws;
}
