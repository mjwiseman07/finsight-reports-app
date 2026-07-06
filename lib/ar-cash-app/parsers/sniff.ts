/**
 * Sniffs raw content to determine which parser to route to.
 */
export type SniffedFormat = "edi_820" | "iso20022_camt054" | "iso20022_pacs008" | null;

export function sniffFormat(content: string, filename?: string): SniffedFormat {
  const c = content.slice(0, 512);
  if (/^ISA\*/.test(c) && /\*820\*/.test(content.slice(0, 2048))) {
    return "edi_820";
  }
  if (/xmlns=["']urn:iso:std:iso:20022:tech:xsd:camt\.054/.test(content)) {
    return "iso20022_camt054";
  }
  if (/<BkToCstmrDbtCdtNtfctn/.test(content)) {
    return "iso20022_camt054";
  }
  if (/xmlns=["']urn:iso:std:iso:20022:tech:xsd:pacs\.008/.test(content)) {
    return "iso20022_pacs008";
  }
  if (filename) {
    const fn = filename.toLowerCase();
    if (fn.endsWith(".edi") || fn.endsWith(".x12")) return "edi_820";
    if (fn.includes("camt054") || fn.includes("camt.054")) return "iso20022_camt054";
    if (fn.includes("pacs008") || fn.includes("pacs.008")) return "iso20022_pacs008";
  }
  return null;
}
