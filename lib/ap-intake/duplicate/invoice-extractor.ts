/**
 * Phase D6.5 Part 2 — Block 4: regex-based invoice field extraction from bill text.
 */
export interface ExtractedInvoiceFields {
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_amount_cents: number | null;
}

const INVOICE_NUMBER_RX =
  /\b(?:invoice|inv|bill)\s*(?:#|no\.?|number)?\s*[:\-]?\s*([A-Z0-9\-]{3,20})\b/i;
const AMOUNT_PREFERRED_RX =
  /(?:total|amount\s*due|balance)\s*[:\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
const AMOUNT_ANY_RX = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
const ISO_DATE_RX = /\b(\d{4}-\d{2}-\d{2})\b/;
const US_DATE_RX = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
const WRITTEN_DATE_RX =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i;

const MONTH_MAP: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

export function extractInvoiceNumber(rawText: string): string | null {
  if (!rawText) return null;
  const m = rawText.match(INVOICE_NUMBER_RX);
  if (!m) return null;
  return m[1].toUpperCase().trim();
}

export function extractInvoiceAmountCents(rawText: string): number | null {
  if (!rawText) return null;
  const preferred = rawText.match(AMOUNT_PREFERRED_RX);
  if (preferred) {
    return parseAmountToCents(preferred[1]);
  }
  const matches = Array.from(rawText.matchAll(AMOUNT_ANY_RX));
  if (matches.length === 0) return null;
  let max = 0;
  for (const m of matches) {
    const cents = parseAmountToCents(m[1]);
    if (cents !== null && cents > max) max = cents;
  }
  return max > 0 ? max : null;
}

export function extractInvoiceDate(rawText: string): string | null {
  if (!rawText) return null;
  const iso = rawText.match(ISO_DATE_RX);
  if (iso) return iso[1];
  const us = rawText.match(US_DATE_RX);
  if (us) {
    const mm = us[1].padStart(2, "0");
    const dd = us[2].padStart(2, "0");
    let yy = us[3];
    if (yy.length === 2) yy = Number(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }
  const w = rawText.match(WRITTEN_DATE_RX);
  if (w) {
    const mm = MONTH_MAP[w[1].toLowerCase()];
    if (!mm) return null;
    const dd = w[2].padStart(2, "0");
    return `${w[3]}-${mm}-${dd}`;
  }
  return null;
}

export function extractInvoiceFields(rawText: string): ExtractedInvoiceFields {
  return {
    invoice_number: extractInvoiceNumber(rawText),
    invoice_date: extractInvoiceDate(rawText),
    invoice_amount_cents: extractInvoiceAmountCents(rawText),
  };
}

function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
