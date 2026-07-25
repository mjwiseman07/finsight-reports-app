import * as XLSX from "xlsx";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";

export function buildSourceDataSheet(
  sourceData: WorkpaperPayload["sourceData"],
): XLSX.WorkSheet {
  const pretty = JSON.stringify(sourceData.apiResponseJson ?? null, null, 2);
  const lines = pretty.split("\n");
  const rows: Array<Array<string>> = [
    ["Source Data — QBO API Response Snapshot"],
    [`Fetched at: ${sourceData.fetchedAt}`],
    [`Realm: ${sourceData.qboRealmId}`],
    [`Connection: ${sourceData.qboConnectionId || "(none)"}`],
    [],
    ...lines.map((line) => [line]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 120 }];
  return ws;
}
