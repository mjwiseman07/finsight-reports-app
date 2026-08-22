/**
 * JE-3B1 — Normalized provider JournalEntry shape + deterministic hash.
 * Cents stay integer. No floating-domain authority.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";

export type NormalizedProviderJeLine = {
  sequence: number;
  accountId: string;
  debitCents: number;
  creditCents: number;
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

/**
 * Normalize a raw QBO JournalEntry entity into provider-neutral cents shape.
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
      debitCents,
      creditCents,
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
  const currency = String(
    currencyRef.value || currencyRef.Value || "USD",
  ).trim() || "USD";

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

export function canonicalizeNormalizedProviderJe(
  je: NormalizedProviderJe,
): Record<string, unknown> {
  return {
    currency: je.currency,
    docNumber: je.docNumber,
    lines: je.lines.map((l) => ({
      accountId: l.accountId,
      creditCents: l.creditCents,
      debitCents: l.debitCents,
      description: l.description,
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

/**
 * Economic match: marker alone is insufficient.
 * Compares txnDate, currency, line count, ordered account ids, debit/credit cents, totals.
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
    }>;
    totalDebitsCents: number;
    totalCreditsCents: number;
  };
}): boolean {
  const { candidate, expected } = args;
  if (candidate.txnDate !== String(expected.txnDate).slice(0, 10)) return false;
  if (candidate.currency !== expected.currency) return false;
  if (candidate.lines.length !== expected.lines.length) return false;
  if (candidate.totalDebitsCents !== expected.totalDebitsCents) return false;
  if (candidate.totalCreditsCents !== expected.totalCreditsCents) return false;
  for (let i = 0; i < expected.lines.length; i++) {
    const a = candidate.lines[i];
    const b = expected.lines[i];
    if (a.accountId !== b.accountId) return false;
    if (a.debitCents !== b.debitCents) return false;
    if (a.creditCents !== b.creditCents) return false;
  }
  return true;
}

export function privateNoteContainsCorrelationMarker(
  privateNote: string | null | undefined,
  correlationMarker: string,
): boolean {
  const note = String(privateNote || "");
  const marker = String(correlationMarker || "").trim();
  if (!marker) return false;
  return note.includes(marker);
}
