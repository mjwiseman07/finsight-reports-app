import * as XLSX from "xlsx";
import type { ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { formatIsoDate, humanKindLabel } from "./format";

export function buildCoverSheet(face: ReconFaceSpec): XLSX.WorkSheet {
  const rows: Array<Array<string | number>> = [
    [humanKindLabel(face.tieOutKind)],
    [],
    ["Engagement", face.engagementName],
    ["Engagement ID", face.engagementId],
    ["Period End", formatIsoDate(face.periodEnd)],
    ["Tie-Out Kind", face.tieOutKind],
    ["Run ID", face.runId],
    ["Generated At", face.generatedAt],
    ...(face.regeneratedFromRunId
      ? [
          [
            "Regenerated From",
            `Run ${face.regeneratedFromRunId.slice(0, 8)} on ${formatIsoDate(face.regeneratedAt)}`,
          ] as Array<string | number>,
        ]
      : []),
    ["Tie Status", face.tieStatus === "ties" ? "TIES" : "KICKOUT"],
    [],
    ["Prepared by", ""],
    ["Date", ""],
    ["Reviewed by", ""],
    ["Date", ""],
    [],
    ["Prepared by Advisacor"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 48 }];
  return ws;
}
