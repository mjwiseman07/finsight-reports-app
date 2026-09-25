/**
 * Deterministic canonical evidence extraction from an accounting_syncs row.
 *
 * Acceptance rule:
 * - validation_status, company, connection, and period are copied from the row
 *   and checked by the orchestrator against execution custody.
 * - last_synced_at must be present for the at-or-after-VERIFIED rule. This
 *   extractor does not invent a timestamp from created_at.
 * - Trial-balance netAmount is major currency units converted to integer cents
 *   (half away via Math.round(amount * 100)).
 * - Journal visibility requires a normalized transaction whose id or
 *   metadata.providerJournalId equals the verified provider journal id and
 *   whose metadata.lines expose account/debit/credit cents.
 * - Absence of that transaction is lag (visibleJournalLines null), not a match.
 * - Empty trial balance, or a matched journal with unusable lines, is partial.
 * - Raw payload, tokens, and authorization headers are not copied through.
 */

import type {
  PostWriteCanonicalEvidence,
  PostWriteVisibleJournalLine,
} from "./post-write-verification-types";

export function majorUnitsToCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function integerCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

function lineFromUnknown(value: unknown): PostWriteVisibleJournalLine | null {
  const row = asRecord(value);
  if (!row) return null;
  const accountId = String(row.accountId || row.account_id || "").trim();
  if (!accountId) return null;
  const debitCents = integerCents(row.debitCents ?? row.debit_cents);
  const creditCents = integerCents(row.creditCents ?? row.credit_cents);
  if (debitCents != null && creditCents != null) {
    return { accountId, debitCents, creditCents };
  }
  const debit = typeof row.debit === "number" ? majorUnitsToCents(row.debit) : null;
  const credit = typeof row.credit === "number" ? majorUnitsToCents(row.credit) : null;
  if (debit == null || credit == null) return null;
  return { accountId, debitCents: debit, creditCents: credit };
}

function journalMatches(entity: Record<string, unknown>, providerJournalId: string): boolean {
  const metadata = asRecord(entity.metadata) || {};
  const candidates = [
    entity.id,
    metadata.providerJournalId,
    metadata.provider_journal_id,
    metadata.journalId,
  ];
  return candidates.some((value) => String(value || "").trim() === providerJournalId);
}

export function extractPostWriteCanonicalEvidence(args: {
  accountingSyncId: string;
  companyId: string | null;
  connectionId: string | null;
  periodEnd: string | null;
  validationStatus: string | null;
  syncedAt: string | null;
  providerJournalId: string;
  normalizedPayload: unknown;
}): PostWriteCanonicalEvidence {
  const payload = asRecord(args.normalizedPayload) || {};
  const trialBalance = Array.isArray(payload.normalizedTrialBalance)
    ? payload.normalizedTrialBalance
    : [];
  const accountBalancesCents: Record<string, number> = {};
  for (const row of trialBalance) {
    const record = asRecord(row);
    if (!record) continue;
    const accountId = String(record.accountId || "").trim();
    const net = typeof record.netAmount === "number" ? record.netAmount : null;
    if (!accountId || net == null) continue;
    const cents = majorUnitsToCents(net);
    if (cents == null) continue;
    accountBalancesCents[accountId] = cents;
  }

  const transactions = Array.isArray(payload.normalizedTransactions)
    ? payload.normalizedTransactions
    : [];
  const providerJournalId = String(args.providerJournalId || "").trim();
  let sawJournal = false;
  let linesUnusable = false;
  const visibleJournalLines: PostWriteVisibleJournalLine[] = [];
  for (const entity of transactions) {
    const record = asRecord(entity);
    if (!record || !journalMatches(record, providerJournalId)) continue;
    sawJournal = true;
    const metadata = asRecord(record.metadata) || {};
    const rawLines = metadata.lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      linesUnusable = true;
      continue;
    }
    for (const rawLine of rawLines) {
      const line = lineFromUnknown(rawLine);
      if (!line) {
        linesUnusable = true;
        continue;
      }
      visibleJournalLines.push(line);
    }
  }

  const partial = trialBalance.length === 0 || (sawJournal && linesUnusable);
  return {
    accountingSyncId: String(args.accountingSyncId),
    companyId: String(args.companyId || ""),
    connectionId: String(args.connectionId || ""),
    periodEnd: String(args.periodEnd || "").slice(0, 10),
    validationStatus: String(args.validationStatus || ""),
    syncedAt: args.syncedAt ? String(args.syncedAt) : null,
    partial,
    visibleJournalLines: sawJournal && !linesUnusable ? visibleJournalLines : null,
    accountBalancesCents,
    reconEvidence: {},
  };
}
