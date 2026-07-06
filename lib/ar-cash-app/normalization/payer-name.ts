/**
 * Normalize a payer name from bank memo / wire OBI for exact-comparison lookup.
 */
export function normalizePayerName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toUpperCase();
  if (!s) return null;
  s = s.replace(/[.,;:'"`()[\]{}]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s
    .replace(
      /\b(LLC|L\.L\.C\.|INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|LP|LLP|PLC|PC|PA)\b\.?/g,
      "",
    )
    .trim();
  s = s.replace(/\s+/g, " ").trim();
  return s || null;
}

export function payerTokenOverlap(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const m = email.trim().toLowerCase().match(/^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/);
  return m ? m[1] : null;
}
