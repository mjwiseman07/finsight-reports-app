import { createHash } from "node:crypto";
import { PDFDocument, PDFHexString, PDFString } from "pdf-lib";

/**
 * Strip wall-clock timestamps so identical input hashes to identical bytes.
 * Mirrors fa-rollforward-pdf / bs-summary-pdf post-process.
 */
export async function pdfStabilize(rawBytes: Uint8Array | Buffer): Promise<Buffer> {
  const doc2 = await PDFDocument.load(rawBytes, { updateMetadata: false });
  const epoch = new Date(0);
  doc2.setCreationDate(epoch);
  doc2.setModificationDate(epoch);
  for (const [ref, obj] of doc2.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFString)) continue;
    try {
      obj.decodeDate();
    } catch {
      continue;
    }
    doc2.context.assign(ref, PDFString.fromDate(epoch));
  }
  const placeholder = PDFHexString.of("00000000000000000000000000000000");
  doc2.context.trailerInfo.ID = doc2.context.obj([placeholder, placeholder]);
  const pass1 = await doc2.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });
  const idHex = createHash("md5").update(pass1).digest("hex");
  const id = PDFHexString.of(idHex);
  doc2.context.trailerInfo.ID = doc2.context.obj([id, id]);
  const out = await doc2.save({
    useObjectStreams: false,
    addDefaultPage: false,
  });
  return Buffer.from(out);
}
