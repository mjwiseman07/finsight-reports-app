/**
 * Normalize an invoice reference for matching:
 *   - Strip whitespace
 *   - Uppercase
 *   - Remove common prefixes: INV-, INV, INVOICE, #, INV#
 *   - Remove leading zeros (INV-0001 → 1)
 *   - Strip non-alphanumerics except we KEEP dash-separated segment structure
 *   - Return null for empty/unusable inputs
 */
export function normalizeInvoiceRef(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toUpperCase();
  if (!s) return null;
  s = s.replace(/^(INVOICE|INV|#|INV#|INV-)\s*/i, "");
  s = s.replace(/^#/, "");
  s = s.replace(/[^A-Z0-9-]/g, "");
  s = s
    .split("-")
    .map((seg) => seg.replace(/^0+(?=\d)/, ""))
    .join("-");
  s = s.replace(/^-+|-+$/g, "");
  s = s.replace(/-+/g, "-");
  return s || null;
}
