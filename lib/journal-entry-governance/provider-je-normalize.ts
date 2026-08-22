/**
 * JE-3B1 / JE-3C — Normalized provider JournalEntry shape + deterministic hash.
 * Cents stay integer. ClassRef included when present. No floating-domain authority.
 *
 * Hash meanings (never compare across categories):
 * - JE-3B2 provider_response_hash: raw POST response body hash
 * - JE-3C provider_readback_hash: hashNormalizedProviderJe(read-back)
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";

export type NormalizedProviderJeLine = {
  sequence: number;
  accountId: string;
  /** Debit | Credit derived from posting type. */
  postingSide: "Debit" | "Credit";
  debitCents: number;
  creditCents: number;
  /** ClassRef value when present; null when absent. */
  classId: string | null;
  /** Preserved in snapshot/hash; not economic-equality-critical by default. */
  description: string | null;
};

export type NormalizedProviderJe = {
  providerJournalId: string;
  txnDate: string;
  currency: string;
  privateNote: string | null;
  docNumber: string | null;
  lines: NormalizedProviderJeLine[];
  totalDebitsCents: number;
  totalCreditsCents: number;
};

/** Dollars (QBO Amount) → integer cents. Half-up via fixed(2) then *100. */
export function qboAmountToCents(amount: unknown): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Number(n.toFixed(2)) * 100);
}

export function normalizeCurrency(currency: unknown): string {
  const c = String(currency || "USD").trim().toUpperCase();
  return c || "USD";
}

function postingTypeOf(raw: Record<string, unknown>): "Debit" | "Credit" | null {
  const detail =
    (raw.JournalEntryLineDetail as Record<string, unknown> | undefined) ||
    (raw.journalEntryLineDetail as Record<string, unknown> | undefined) ||
    {};
  const pt = String(detail.PostingType || detail.postingType || "").trim();
  if (pt === "Debit" || pt === "Credit") return pt;
  return null;
}

function accountIdOf(raw: Record<string, unknown>): string {
  const detail =
    (raw.JournalEntryLineDetail as Record<string, unknown> | undefined) ||
    (raw.journalEntryLineDetail as Record<string, unknown> | undefined) ||
    {};
  const ref =
    (detail.AccountRef as Record<string, unknown> | undefined) ||
    (detail.accountRef as Record<string, unknown> | undefined) ||
    {};
  return String(ref.value || ref.Value || "").trim();
}

function classIdOf(raw: Record<string, unknown>): string | null {
  const detail =
    (raw.JournalEntryLineDetail as Record<string, unknown> | undefined) ||
    (raw.journalEntryLineDetail as Record<string, unknown> | undefined) ||
    {};
  const ref =
    (detail.ClassRef as Record<string, unknown> | undefined) ||
    (detail.classRef as Record<string, unknown> | undefined) ||
    null;
  if (!ref) return null;
  const v = String(ref.value || ref.Value || "").trim();
  return v || null;
}

/**
 * Normalize a raw QBO JournalEntry entity into provider-neutral cents shape.
 * Excludes SyncToken, MetaData timestamps, and other provider-generated fields
 * from economic authority (docNumber kept for snapshot only).
 */
export function normalizeQboJournalEntry(
  raw: Record<string, unknown>,
): NormalizedProviderJe {
  const linesRaw = Array.isArray(raw.Line)
    ? (raw.Line as Record<string, unknown>[])
    : [];
  const lines: NormalizedProviderJeLine[] = [];
  let totalDebits = 0;
  let totalCredits = 0;
  let seq = 0;
  for (const line of linesRaw) {
    const detailType = String(line.DetailType || line.detailType || "");
    if (detailType && detailType !== "JournalEntryLineDetail") continue;
    const posting = postingTypeOf(line);
    if (!posting) continue;
    const accountId = accountIdOf(line);
    if (!accountId) continue;
    const cents = qboAmountToCents(line.Amount ?? line.amount);
    const debitCents = posting === "Debit" ? cents : 0;
    const creditCents = posting === "Credit" ? cents : 0;
    totalDebits += debitCents;
    totalCredits += creditCents;
    lines.push({
      sequence: seq++,
      accountId,
      postingSide: posting,
      debitCents,
      creditCents,
      classId: classIdOf(line),
      description:
        line.Description != null
          ? String(line.Description)
          : line.description != null
            ? String(line.description)
            : null,
    });
  }

  const currencyRef =
    (raw.CurrencyRef as Record<string, unknown> | undefined) ||
    (raw.currencyRef as Record<string, unknown> | undefined) ||
    {};
  const currency = normalizeCurrency(
    currencyRef.value || currencyRef.Value || "USD",
  );

  return {
    providerJournalId: String(raw.Id || raw.id || "").trim(),
    txnDate: String(raw.TxnDate || raw.txnDate || "").slice(0, 10),
    currency,
    privateNote:
      raw.PrivateNote != null
        ? String(raw.PrivateNote)
        : raw.privateNote != null
          ? String(raw.privateNote)
          : null,
    docNumber:
      raw.DocNumber != null
        ? String(raw.DocNumber)
        : raw.docNumber != null
          ? String(raw.docNumber)
          : null,
    lines,
    totalDebitsCents: totalDebits,
    totalCreditsCents: totalCredits,
  };
}

/**
 * Snapshot used for JE-3C verification custody hash.
 * Descriptions preserved; provider metadata (SyncToken etc.) excluded.
 */
export function canonicalizeNormalizedProviderJe(
  je: NormalizedProviderJe,
): Record<string, unknown> {
  return {
    currency: normalizeCurrency(je.currency),
    lines: je.lines.map((l) => ({
      accountId: l.accountId,
      classId: l.classId,
      creditCents: l.creditCents,
      debitCents: l.debitCents,
      description: l.description,
      postingSide: l.postingSide,
      sequence: l.sequence,
    })),
    privateNote: je.privateNote,
    providerJournalId: je.providerJournalId,
    totalCreditsCents: je.totalCreditsCents,
    totalDebitsCents: je.totalDebitsCents,
    txnDate: je.txnDate,
  };
}

export function hashNormalizedProviderJe(je: NormalizedProviderJe): string {
  return sha256Hex(stableCanonicalJson(canonicalizeNormalizedProviderJe(je)));
}

export type JeEconomicLineExpectation = {
  accountId: string;
  debitCents: number;
  creditCents: number;
  /** When present on the governed request, must match. */
  classId?: string | null;
};

export type JeEconomicExpectation = {
  txnDate: string;
  currency: string;
  lines: JeEconomicLineExpectation[];
  totalDebitsCents: number;
  totalCreditsCents: number;
};

export type JeEconomicMismatchDimension =
  | "txn_date"
  | "currency"
  | "line_count"
  | "account"
  | "posting_side"
  | "amount"
  | "class"
  | "multiplicity"
  | "total_debits"
  | "total_credits"
  | "provider_id"
  | "correlation_marker";

function economicLineKey(args: {
  accountId: string;
  postingSide: "Debit" | "Credit";
  amountCents: number;
  classId: string | null;
  /** When expected did not govern class, ignore class in the key. */
  includeClass: boolean;
}): string {
  const classPart = args.includeClass ? String(args.classId || "") : "";
  return [
    args.accountId,
    args.postingSide,
    String(args.amountCents),
    classPart,
  ].join("|");
}

function multisetFromLines(
  lines: Array<{
    accountId: string;
    debitCents: number;
    creditCents: number;
    classId?: string | null;
  }>,
  opts: { includeClass: boolean },
): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    const debit = Number(line.debitCents) || 0;
    const credit = Number(line.creditCents) || 0;
    const postingSide: "Debit" | "Credit" =
      debit > 0 && credit === 0
        ? "Debit"
        : credit > 0 && debit === 0
          ? "Credit"
          : debit > 0
            ? "Debit"
            : "Credit";
    const amountCents = postingSide === "Debit" ? debit : credit;
    const key = economicLineKey({
      accountId: String(line.accountId),
      postingSide,
      amountCents,
      classId: line.classId != null ? String(line.classId) : null,
      includeClass: opts.includeClass,
    });
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function anyExpectedLineHasClass(lines: JeEconomicLineExpectation[]): boolean {
  return lines.some(
    (l) => l.classId != null && String(l.classId).trim() !== "",
  );
}

/**
 * Deterministic economic equality for JE-3C verification.
 * Order-independent multiset by governed dimensions. Descriptions excluded.
 * ClassRef compared only when present on the governed request.
 */
export function compareProviderJeEconomics(args: {
  candidate: NormalizedProviderJe;
  expected: JeEconomicExpectation;
}): {
  ok: boolean;
  mismatches: JeEconomicMismatchDimension[];
} {
  const mismatches: JeEconomicMismatchDimension[] = [];
  const { candidate, expected } = args;
  const expectedCurrency = normalizeCurrency(expected.currency);
  const candidateCurrency = normalizeCurrency(candidate.currency);

  if (candidate.txnDate !== String(expected.txnDate).slice(0, 10)) {
    mismatches.push("txn_date");
  }
  if (candidateCurrency !== expectedCurrency) {
    mismatches.push("currency");
  }
  if (candidate.lines.length !== expected.lines.length) {
    mismatches.push("line_count");
  }
  if (candidate.totalDebitsCents !== expected.totalDebitsCents) {
    mismatches.push("total_debits");
  }
  if (candidate.totalCreditsCents !== expected.totalCreditsCents) {
    mismatches.push("total_credits");
  }

  const includeClass = anyExpectedLineHasClass(expected.lines);
  const expectedBag = multisetFromLines(expected.lines, { includeClass });
  const candidateBag = multisetFromLines(
    candidate.lines.map((l) => ({
      accountId: l.accountId,
      debitCents: l.debitCents,
      creditCents: l.creditCents,
      classId: l.classId,
    })),
    { includeClass },
  );

  if (expectedBag.size !== candidateBag.size) {
    mismatches.push("multiplicity");
  } else {
    for (const [key, count] of expectedBag) {
      if ((candidateBag.get(key) || 0) !== count) {
        // Classify dimension for diagnostics.
        if (includeClass && key.split("|")[3] !== undefined) {
          mismatches.push("class");
        }
        mismatches.push("multiplicity");
        mismatches.push("account");
        mismatches.push("posting_side");
        mismatches.push("amount");
        break;
      }
    }
  }

  return { ok: mismatches.length === 0, mismatches: [...new Set(mismatches)] };
}

/**
 * Legacy boolean wrapper used by discovery. Delegates to multiset compare.
 */
export function providerJeMatchesExpectedEconomics(args: {
  candidate: NormalizedProviderJe;
  expected: {
    txnDate: string;
    currency: string;
    lines: Array<{
      accountId: string;
      debitCents: number;
      creditCents: number;
      classId?: string | null;
    }>;
    totalDebitsCents: number;
    totalCreditsCents: number;
  };
}): boolean {
  return compareProviderJeEconomics(args).ok;
}

/**
 * Boundary-safe exact marker presence in PrivateNote.
 * Rejects accidental substring hits inside longer tokens.
 */
export function privateNoteContainsExactCorrelationMarker(
  privateNote: string | null | undefined,
  correlationMarker: string,
): boolean {
  const note = String(privateNote || "");
  const marker = String(correlationMarker || "").trim();
  if (!marker) return false;
  let from = 0;
  while (from <= note.length) {
    const idx = note.indexOf(marker, from);
    if (idx < 0) return false;
    const before = idx === 0 ? "" : note[idx - 1];
    const afterIdx = idx + marker.length;
    const after = afterIdx >= note.length ? "" : note[afterIdx];
    const beforeOk = before === "" || /[\s|,:;]/.test(before);
    // Allow end, whitespace, or non-alnum (but not extending the token).
    const afterOk =
      after === "" || /[\s|,:;]/.test(after) || !/[A-Za-z0-9_-]/.test(after);
    if (beforeOk && afterOk) return true;
    from = idx + 1;
  }
  return false;
}

/** @deprecated Prefer privateNoteContainsExactCorrelationMarker for JE-3C. */
export function privateNoteContainsCorrelationMarker(
  privateNote: string | null | undefined,
  correlationMarker: string,
): boolean {
  return privateNoteContainsExactCorrelationMarker(
    privateNote,
    correlationMarker,
  );
}
