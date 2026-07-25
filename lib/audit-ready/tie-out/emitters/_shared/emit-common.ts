import * as XLSX from "xlsx";
import type {
  WorkpaperEmitter,
  WorkpaperPayload,
} from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { uploadRunArtifact } from "@/lib/audit-ready/tie-out/upload-artifact";
import { buildCoverSheet } from "./xlsx-cover";
import { buildFaceSheet } from "./xlsx-face";
import { buildBackupSheet, safeSheetName } from "./xlsx-backup";
import { buildSourceDataSheet } from "./xlsx-source-data";
import { emitWorkpaperPdf } from "./emit-pdf";

export { emitWorkpaperPdf };

export async function emitWorkpaperXlsx(
  payload: WorkpaperPayload,
): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildCoverSheet(payload.face), "Cover");
  XLSX.utils.book_append_sheet(wb, buildFaceSheet(payload.face), "Recon Face");
  const used = new Set<string>(["Cover", "Recon Face", "Source Data"]);
  for (const tab of payload.backupTabs) {
    let name = safeSheetName(tab.tabName);
    let n = 2;
    while (used.has(name)) {
      const suffix = ` (${n})`;
      name = safeSheetName(tab.tabName.slice(0, 31 - suffix.length) + suffix);
      n += 1;
    }
    used.add(name);
    XLSX.utils.book_append_sheet(wb, buildBackupSheet(tab), name);
  }
  XLSX.utils.book_append_sheet(
    wb,
    buildSourceDataSheet(payload.sourceData),
    "Source Data",
  );
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

/**
 * Primary workpaper write to audit_ready_run_artifacts.
 * Failures propagate — Block E maturity gate (no longer best-effort).
 */
export async function dualWriteWorkpaper(params: {
  emitter: WorkpaperEmitter;
  runId: string;
  engagementId: string;
  generatedBy: string | null;
}): Promise<void> {
  const { emitter, runId, engagementId, generatedBy } = params;
  const payload = await emitter.build(runId);
  const xlsxBuf = await emitter.emitXlsx(payload);
  const pdfBuf = await emitter.emitPdf(payload);
  await uploadRunArtifact({
    runId,
    engagementId,
    artifactKind: "xlsx",
    fileBytes: xlsxBuf,
    generatedBy,
  });
  await uploadRunArtifact({
    runId,
    engagementId,
    artifactKind: "pdf",
    fileBytes: pdfBuf,
    generatedBy,
  });
}

/** Alias — Block E primary path (same as dualWriteWorkpaper after promote). */
export const writeWorkpaperArtifacts = dualWriteWorkpaper;
