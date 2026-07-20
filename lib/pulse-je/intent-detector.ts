import type { JeIntentSignal } from "./types";

// Deterministic regex-first detector. LLM fallback deliberately excluded here to keep
// PULSE-JE-1 cheap and testable. LLM fallback can be added in a later micropatch.

const AMOUNT_REGEX =
  /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/;

const RECLASS_PATTERNS: Array<RegExp> = [
  /move\s+(?:the\s+)?(?:expense\s+of\s+)?(\$?[0-9.,]+)\s+(?:from\s+(.+?)\s+to\s+(.+?))(?:$|[.,;])/i,
  /reclass(?:ify)?\s+(\$?[0-9.,]+)\s+from\s+(.+?)\s+to\s+(.+?)(?:$|[.,;])/i,
  /transfer\s+(\$?[0-9.,]+)\s+from\s+(.+?)\s+to\s+(.+?)(?:$|[.,;])/i,
  /(?:please\s+)?(?:re)?post\s+(\$?[0-9.,]+)\s+from\s+(.+?)\s+to\s+(.+?)(?:$|[.,;])/i,
];

const RECLASS_INDIRECT: RegExp =
  /was\s+posted\s+to\s+(.+?)\s+for\s+(\$?[0-9.,]+)[^.]*(?:please\s+)?(?:move|reclass(?:ify)?|transfer)\s+(?:the\s+expense\s+)?to\s+(.+?)(?:$|[.,;])/i;

const CLEAN_ACCOUNT = (raw: string) =>
  raw
    .replace(/["'`]/g, "")
    .replace(/\s+account\b/i, "")
    .trim()
    .replace(/\s+/g, " ");

const CLEAN_AMOUNT = (raw: string): number | undefined => {
  const s = raw.replace(/[$,\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : undefined;
};

const DATE_TODAY_ISO = (): string => new Date().toISOString().slice(0, 10);

export function detectJournalEntryIntent(input: string): JeIntentSignal {
  const raw = String(input || "").trim();
  if (!raw) return { kind: "unclear", raw_text: raw, confidence: 0, hints: {} };

  for (const pattern of RECLASS_PATTERNS) {
    const m = raw.match(pattern);
    if (m) {
      const amount = CLEAN_AMOUNT(m[1] || "");
      const from = CLEAN_ACCOUNT(m[2] || "");
      const to = CLEAN_ACCOUNT(m[3] || "");
      if (amount && from && to) {
        return {
          kind: "reclass",
          raw_text: raw,
          confidence: 0.9,
          hints: {
            amount,
            from_account_phrase: from,
            to_account_phrase: to,
            memo: `Reclassification: ${from} → ${to}`,
            txn_date_iso: DATE_TODAY_ISO(),
          },
        };
      }
    }
  }

  const indirect = raw.match(RECLASS_INDIRECT);
  if (indirect) {
    const from = CLEAN_ACCOUNT(indirect[1] || "");
    const amount = CLEAN_AMOUNT(indirect[2] || "");
    const to = CLEAN_ACCOUNT(indirect[3] || "");
    if (amount && from && to) {
      return {
        kind: "reclass",
        raw_text: raw,
        confidence: 0.8,
        hints: {
          amount,
          from_account_phrase: from,
          to_account_phrase: to,
          memo: `Reclassification: ${from} → ${to}`,
          txn_date_iso: DATE_TODAY_ISO(),
        },
      };
    }
  }

  const amt = raw.match(AMOUNT_REGEX);
  const amountOnly = amt ? CLEAN_AMOUNT(amt[1] || "") : undefined;
  return {
    kind: "unclear",
    raw_text: raw,
    confidence: 0,
    hints: amountOnly ? { amount: amountOnly } : {},
  };
}
