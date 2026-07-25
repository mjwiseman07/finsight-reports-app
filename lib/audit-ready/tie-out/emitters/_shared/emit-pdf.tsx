import React from "react";
import { Document, renderToBuffer } from "@react-pdf/renderer";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { PdfCover } from "./pdf-cover";
import { PdfFace } from "./pdf-face";
import { pdfStabilize } from "./pdf-stabilize";

export async function emitWorkpaperPdf(
  payload: WorkpaperPayload,
): Promise<Buffer> {
  const doc = (
    <Document>
      <PdfCover face={payload.face} />
      <PdfFace face={payload.face} />
    </Document>
  );
  const raw = await renderToBuffer(doc);
  return pdfStabilize(raw);
}
