const ENTITY_SUFFIX_RE =
  /\b(inc|incorporated|llc|l\.l\.c\.|corp|corporation|co|company|ltd|limited|plc|lp|llp)\b\.?/g;

export function normalizeVendorName(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(ENTITY_SUFFIX_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 128);
}
