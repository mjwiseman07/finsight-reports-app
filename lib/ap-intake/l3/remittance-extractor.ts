/**
 * Phase D6.5 Part 2 — Block 3
 * L3 Remittance Extractor — regex-based routing/account extraction from bill text.
 * OCR replacement lands in Block 6 (L0.5). This block ships the regex path
 * so L3 has real data on structured bills today.
 */
export interface ExtractedRemittance {
  routing_number: string | null; // 9-digit ABA if found; else null
  account_number: string | null; // 4-17 digits if found; else null
  raw_snippet: string | null;
}

// Anchor keywords are case-insensitive; up to 10 chars of non-digit noise
// (spaces, punctuation, "#", etc.) allowed between the keyword and the digits.
const ROUTING_RE = /\b(?:routing|aba|rtn)\D{0,10}(\d{9})\b/i;
const ACCOUNT_RE = /\b(?:account|acct|a\/c)\D{0,10}(\d{4,17})\b/i;

export function extractRemittance(billText: string): ExtractedRemittance {
  if (!billText || typeof billText !== "string") {
    return { routing_number: null, account_number: null, raw_snippet: null };
  }

  const routingMatch = billText.match(ROUTING_RE);
  const accountMatch = billText.match(ACCOUNT_RE);

  let snippet: string | null = null;
  if (routingMatch || accountMatch) {
    const primary = routingMatch ?? accountMatch;
    const idx = primary?.index ?? 0;
    const start = Math.max(0, idx - 40);
    const end = Math.min(billText.length, idx + 80);
    snippet = billText.slice(start, end).trim();
  }

  return {
    routing_number: routingMatch ? routingMatch[1] : null,
    account_number: accountMatch ? accountMatch[1] : null,
    raw_snippet: snippet,
  };
}

export function last4(digits: string): string {
  return digits.slice(-4);
}
