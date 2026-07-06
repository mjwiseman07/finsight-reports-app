/**
 * EDI 820 Payment Order / Remittance Advice — deterministic parser stub.
 */
export interface Edi820RemittanceLine {
  invoiceReference: string;
  amountPaid: number;
  amountDiscount?: number;
  amountDeduction?: number;
  paymentDateHint?: string;
  rawSegment: string;
}

export interface Edi820ParseResult {
  isaControlNumber: string;
  bprAmountTotal: number;
  trnTraceNumber: string | null;
  payerName: string | null;
  lines: Edi820RemittanceLine[];
}

export class Edi820ParseError extends Error {
  constructor(
    message: string,
    public segment?: string,
  ) {
    super(message);
    this.name = "Edi820ParseError";
  }
}

const SEG_TERMINATOR = "~";
const ELEM_SEPARATOR = "*";

export function parseEdi820(raw: string): Edi820ParseResult {
  if (!raw || !raw.trim()) {
    throw new Edi820ParseError("Empty EDI 820 payload");
  }

  const segments = raw
    .split(SEG_TERMINATOR)
    .map((s) => s.trim())
    .filter(Boolean);

  let isaControl: string | null = null;
  let bprTotal: number | null = null;
  let trn: string | null = null;
  let payerName: string | null = null;
  const lines: Edi820RemittanceLine[] = [];
  let currentLine: Partial<Edi820RemittanceLine> | null = null;

  for (const seg of segments) {
    const parts = seg.split(ELEM_SEPARATOR);
    const tag = parts[0];

    switch (tag) {
      case "ISA":
        isaControl = parts[13] ?? null;
        break;
      case "BPR":
        bprTotal = parseFloat(parts[2] ?? "0");
        break;
      case "TRN":
        trn = parts[2] ?? null;
        break;
      case "N1":
        if (parts[1] === "PR") {
          payerName = parts[2] ?? null;
        }
        break;
      case "RMR":
        if (currentLine?.invoiceReference != null && currentLine.amountPaid != null) {
          lines.push(currentLine as Edi820RemittanceLine);
        }
        currentLine = {
          invoiceReference: parts[2] ?? "",
          amountPaid: parseFloat(parts[4] ?? "0"),
          amountDiscount: parts[5] ? parseFloat(parts[5]) : undefined,
          rawSegment: seg,
        };
        break;
      case "ADX":
        if (currentLine) {
          currentLine.amountDeduction = parseFloat(parts[1] ?? "0");
        }
        break;
      case "DTM":
        if (currentLine && parts[1] === "003") {
          const d = parts[2] ?? "";
          if (/^\d{8}$/.test(d)) {
            currentLine.paymentDateHint = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
          }
        }
        break;
      case "SE":
      case "GE":
      case "IEA":
        if (currentLine?.invoiceReference != null && currentLine.amountPaid != null) {
          lines.push(currentLine as Edi820RemittanceLine);
          currentLine = null;
        }
        break;
      default:
        break;
    }
  }

  if (currentLine?.invoiceReference != null && currentLine.amountPaid != null) {
    lines.push(currentLine as Edi820RemittanceLine);
  }

  if (isaControl == null) {
    throw new Edi820ParseError("Missing ISA segment / control number");
  }
  if (bprTotal == null) {
    throw new Edi820ParseError("Missing BPR (payment header) segment");
  }

  return {
    isaControlNumber: isaControl,
    bprAmountTotal: bprTotal,
    trnTraceNumber: trn,
    payerName,
    lines,
  };
}
