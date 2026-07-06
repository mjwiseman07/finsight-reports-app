/**
 * ISO 20022 camt.054 — Bank-to-Customer Debit/Credit Notification stub.
 */
import { XMLParser } from "fast-xml-parser";

export interface Camt054Entry {
  amount: number;
  currency: string;
  bookingDate: string;
  debtorName: string | null;
  invoiceReferences: string[];
  unstructuredRemittance: string[];
}

export interface Camt054ParseResult {
  messageId: string;
  entries: Camt054Entry[];
}

export class Camt054ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Camt054ParseError";
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["Ntry", "TxDtls", "Strd", "CdtrRefInf", "Ustrd"].includes(name),
});

function toStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (obj["#text"]) return String(obj["#text"]);
  }
  return null;
}

export function parseCamt054(xml: string): Camt054ParseResult {
  if (!xml || !xml.trim()) {
    throw new Camt054ParseError("Empty camt.054 payload");
  }

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Camt054ParseError(`XML parse failed: ${msg}`);
  }

  const document = doc?.Document as Record<string, unknown> | undefined;
  const bkToCstmr = document?.BkToCstmrDbtCdtNtfctn as Record<string, unknown> | undefined;
  if (!bkToCstmr) {
    throw new Camt054ParseError("Missing BkToCstmrDbtCdtNtfctn root");
  }

  const grpHdr = bkToCstmr.GrpHdr as Record<string, unknown> | undefined;
  const messageId = toStr(grpHdr?.MsgId) ?? "";
  const ntfctn = bkToCstmr.Ntfctn as Record<string, unknown> | undefined;
  if (!ntfctn) {
    throw new Camt054ParseError("Missing Ntfctn element");
  }

  const rawEntries = Array.isArray(ntfctn.Ntry)
    ? (ntfctn.Ntry as Record<string, unknown>[])
    : ntfctn.Ntry
      ? [ntfctn.Ntry as Record<string, unknown>]
      : [];

  const entries: Camt054Entry[] = [];

  for (const ntry of rawEntries) {
    const cdtDbtInd = toStr(ntry.CdtDbtInd);
    if (cdtDbtInd !== "CRDT") continue;

    const amtNode = ntry.Amt as Record<string, unknown> | string | undefined;
    const amount = parseFloat(toStr(amtNode) ?? "0");
    const currency =
      typeof amtNode === "object" && amtNode != null
        ? String((amtNode as Record<string, unknown>)["@_Ccy"] ?? "USD")
        : "USD";
    const bookgDt = ntry.BookgDt as Record<string, unknown> | undefined;
    const bookingDate = toStr(bookgDt?.Dt) ?? "";

    const txDtls = (ntry.NtryDtls as Record<string, unknown> | undefined)?.TxDtls;
    const txDtlsArr = Array.isArray(txDtls)
      ? (txDtls as Record<string, unknown>[])
      : txDtls
        ? [txDtls as Record<string, unknown>]
        : [];

    let debtorName: string | null = null;
    const invoiceReferences: string[] = [];
    const unstructuredRemittance: string[] = [];

    for (const tx of txDtlsArr) {
      const rltdPties = tx.RltdPties as Record<string, unknown> | undefined;
      const dbtr = (rltdPties?.Dbtr as Record<string, unknown> | undefined)?.Nm;
      if (dbtr && !debtorName) debtorName = toStr(dbtr);

      const rmtInf = tx.RmtInf as Record<string, unknown> | undefined;
      if (rmtInf) {
        const ustrd = rmtInf.Ustrd;
        if (ustrd) {
          const arr = Array.isArray(ustrd) ? ustrd : [ustrd];
          for (const u of arr) {
            const s = toStr(u);
            if (s) unstructuredRemittance.push(s);
          }
        }

        const strd = rmtInf.Strd;
        const strdArr = Array.isArray(strd) ? strd : strd ? [strd] : [];
        for (const s of strdArr) {
          const strdObj = s as Record<string, unknown>;
          const cdtrRefArr = Array.isArray(strdObj.CdtrRefInf)
            ? strdObj.CdtrRefInf
            : strdObj.CdtrRefInf
              ? [strdObj.CdtrRefInf]
              : [];
          for (const c of cdtrRefArr) {
            const ref = toStr((c as Record<string, unknown>).Ref);
            if (ref) invoiceReferences.push(ref);
          }
        }
      }
    }

    entries.push({
      amount,
      currency,
      bookingDate,
      debtorName,
      invoiceReferences,
      unstructuredRemittance,
    });
  }

  return { messageId, entries };
}
