// D6.4b: Canonicalize vendor + invoice number for accrual line matching.
// Used at booking time (D6.4b) and at matching time (D6.4c). MUST be
// deterministic and referentially transparent — same input, same output,
// no I/O, no time, no randomness.

/**
 * Canonical vendor key. Rules:
 *  - Trim, uppercase, collapse internal whitespace
 *  - Remove trailing punctuation
 *  - Remove common trailing entity suffixes (LLC, INC, CORP, CO, LTD, LLP, PLLC, PC, PA)
 *  - Preserve ampersands and internal hyphens (they distinguish vendors)
 */
export function canonicalizeVendorName(name: string): string {
  if (!name) return "";
  let s = name.trim().toUpperCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/[.,]+$/g, "");
  const suffixes = ["LLC", "INC", "CORP", "CO", "LTD", "LLP", "PLLC", "PC", "PA"];
  for (const suf of suffixes) {
    const pat = new RegExp(`(,?\\s+)${suf}\\.?$`, "i");
    s = s.replace(pat, "");
  }
  return s.trim();
}

/**
 * Canonical invoice number key. Rules:
 *  - Trim, uppercase, remove all whitespace
 *  - Strip a leading known prefix (INVOICE, INV, #, NO, etc.)
 *  - Remove hyphens and slashes
 *  - Preserve leading zeros
 */
export function canonicalizeInvoiceNumber(num: string): string {
  if (!num) return "";
  let s = num.trim().toUpperCase();
  s = s.replace(/\s+/g, "");
  const prefixes = ["INVOICE-", "INVOICE", "INV-", "INV#", "INV", "#", "NO.", "NO-", "NO"];
  for (const p of prefixes) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  s = s.replace(/[-/]/g, "");
  return s;
}

/**
 * Combined key for (vendor, invoice_number) matching. Stable string suitable
 * for equality comparison and hashing.
 */
export function accrualLineKey(vendorName: string, invoiceNumber: string): string {
  const v = canonicalizeVendorName(vendorName);
  const i = canonicalizeInvoiceNumber(invoiceNumber);
  return `${v}||${i}`;
}
