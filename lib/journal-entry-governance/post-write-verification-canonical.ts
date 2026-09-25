/**
 * Deterministic canonical evidence extraction from an accounting_syncs row.
 *
 * Acceptance rule:
 * - validation_status, company, connection, and period are copied from the row
 *   and checked by the orchestrator against execution custody.
 * - last_synced_at must be present for the at-or-after-VERIFIED rule. This
 *   extractor does not invent a timestamp from created_at.
 * - Advisacor normalizedTransactions are report entities (inventory and
 *   similar). Their ids look like quickbooks:SourceReport:index:label.
 *   They are not provider journals, and metadata.lines on those entities
 *   is not a journal-line collection.
 * - A journal-line collection is an explicit payload array (or the payload
 *   itself) whose items tie a provider journal id to lines that carry an
 *   account id plus debit and credit cents, or debit and credit major units.
 * - No such collection → journalLineRepresentation absent and
 *   visibleJournalLines null (not provider lag, and not partial).
 * - Collection present but the verified id is missing → present and
 *   visibleJournalLines null (lag).
 * - Collection present and the id matches with usable lines → those lines.
 * - Matched but unusable lines are partial.
 * - Trial-balance accountId / netAmount is not a GL detail ending.
 * - Raw payload, tokens, and authorization headers are not copied through.
 */

import type {
  PostWriteCanonicalEvidence,
  PostWriteReconEvidence,
  PostWriteVisibleJournalLine,
} from "./post-write-verification-types";

export function majorUnitsToCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

const REPORT_ENTITY_KEYS = new Set([
  "normalizedTransactions",
  "normalizedARAging",
  "normalizedAPAging",
  "normalizedBudgets",
  "normalizedDepartments",
  "normalizedLocations",
  "normalizedClasses",
  "normalizedProjects",
  "normalizedVendors",
  "normalizedCustomers",
  "normalizedTrialBalance",
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
  "normalizedIncomeStatementYtd",
  "normalizedCashFlow",
  "normalizedAccounts",
  "canonicalArAgingSchedule",
  "canonicalCashFlowSchedule",
  "statementControl",
  "sourceMetadata",
  "validation",
  "rawReportsPulled",
]);

/** totals_status words. They are not recon_outcome values. */
const TOTALS_STATUS_WORDS = new Set([
  "tie",
  "auto_reconcile",
  "review",
  "kickout",
]);

const SYNC_BACKED_KINDS = {
  ar: "ar_aging",
  ap: "ap_aging",
  inventory: "inventory",
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function integerCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function isQuickBooksReportEntityId(value: string): boolean {
  return /^quickbooks:[^:]+:\d+:/.test(value);
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

function lineDeclaresAccountAndAmounts(value: unknown): boolean {
  const row = asRecord(value);
  if (!row) return false;
  const accountId = String(row.accountId || row.account_id || "").trim();
  if (!accountId || isQuickBooksReportEntityId(accountId)) return false;
  const hasCents =
    "debitCents" in row ||
    "debit_cents" in row ||
    "creditCents" in row ||
    "credit_cents" in row;
  const hasMajor = "debit" in row || "credit" in row;
  return hasCents || hasMajor;
}

type JournalCandidate = {
  providerJournalId: string;
  lines: unknown[];
};

function providerJournalIdFrom(record: Record<string, unknown>): string | null {
  const metadata = asRecord(record.metadata) || {};
  const candidates = [
    record.providerJournalId,
    record.provider_journal_id,
    record.journalId,
    record.journal_id,
    metadata.providerJournalId,
    metadata.provider_journal_id,
    metadata.journalId,
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (!text || isQuickBooksReportEntityId(text)) continue;
    return text;
  }
  const id = String(record.id ?? "").trim();
  if (!id || isQuickBooksReportEntityId(id)) return null;
  return id;
}

function rawLines(record: Record<string, unknown>): unknown[] | null {
  if (Array.isArray(record.lines)) return record.lines;
  if (Array.isArray(record.Line)) return record.Line;
  const metadata = asRecord(record.metadata);
  if (metadata && Array.isArray(metadata.lines)) return metadata.lines;
  return null;
}

function journalCandidate(value: unknown): JournalCandidate | null {
  const record = asRecord(value);
  if (!record) return null;
  const lines = rawLines(record);
  if (!lines || !lines.some(lineDeclaresAccountAndAmounts)) return null;
  const providerJournalId = providerJournalIdFrom(record);
  if (!providerJournalId) return null;
  return { providerJournalId, lines };
}

function collectJournalCandidates(payload: Record<string, unknown>): JournalCandidate[] {
  const found: JournalCandidate[] = [];
  const top = journalCandidate(payload);
  if (top) found.push(top);
  for (const [key, value] of Object.entries(payload)) {
    if (REPORT_ENTITY_KEYS.has(key) || !Array.isArray(value)) continue;
    for (const item of value) {
      const candidate = journalCandidate(item);
      if (candidate) found.push(candidate);
    }
  }
  return found;
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
  const providerJournalId = String(args.providerJournalId || "").trim();
  const journals = collectJournalCandidates(payload);
  const matches = journals.filter(
    (journal) => journal.providerJournalId === providerJournalId,
  );

  let journalLineRepresentation: "absent" | "present" = "absent";
  let visibleJournalLines: PostWriteVisibleJournalLine[] | null = null;
  let partial = false;

  if (journals.length === 0) {
    journalLineRepresentation = "absent";
    visibleJournalLines = null;
  } else if (matches.length === 0) {
    journalLineRepresentation = "present";
    visibleJournalLines = null;
  } else {
    journalLineRepresentation = "present";
    const parsed: PostWriteVisibleJournalLine[] = [];
    let unusable = false;
    for (const match of matches) {
      if (match.lines.length === 0) unusable = true;
      for (const rawLine of match.lines) {
        const line = lineFromUnknown(rawLine);
        if (!line) {
          unusable = true;
          continue;
        }
        parsed.push(line);
      }
    }
    if (unusable || parsed.length === 0) {
      visibleJournalLines = null;
      partial = true;
    } else {
      visibleJournalLines = parsed;
    }
  }

  return {
    accountingSyncId: String(args.accountingSyncId),
    companyId: String(args.companyId || ""),
    connectionId: String(args.connectionId || ""),
    periodEnd: String(args.periodEnd || "").slice(0, 10),
    validationStatus: String(args.validationStatus || ""),
    syncedAt: args.syncedAt ? String(args.syncedAt) : null,
    partial,
    journalLineRepresentation,
    visibleJournalLines,
    glDetailEndingCents: {},
    reconEvidence: {},
  };
}

/**
 * Tie-out row used to prove sync-backed recon outcomes and live-provider
 * GL detail endings. Tests inject these rows. Production loads them by
 * execution engagement and period. Caller-supplied company, sync, and run
 * ids are not accepted by the public verification input.
 */
export type PostWriteTieOutProofRow = {
  id: string;
  engagementId: string;
  periodEnd: string;
  tieOutKind: string;
  status: string;
  reconOutcome: string | null;
  baselineSyncId: string | null;
  unidentifiedResidualCents: number | null;
  /** Present on the row. Not a recon_outcome and not a residual. */
  totalsStatus: string | null;
  /** Measurement variance. Must not be substituted for unidentified residual. */
  totalsVarianceCents: number | null;
  /** GL detail ending on the run (subledger_total_cents). */
  subledgerTotalCents: number | null;
  /** TB comparison on the run (gl_total_cents). Ignored for GL proof. */
  glTotalCents: number | null;
  completedAt: string | null;
  /** Artifact account id. Synthetic trial-balance ids do not qualify. */
  qboAccountId: string | null;
  /** Artifact GL detail ending (ending_balance_cents). */
  endingBalanceCents: number | null;
  /** Artifact TB comparison (gl_ending_balance_cents). Ignored for GL proof. */
  glEndingBalanceCents: number | null;
};

export type PostWriteProofSlot = {
  runId: string | null;
  authoritative: boolean;
  baselineSyncId: string | null;
  measurementSource: "persisted_sync_snapshot" | "live_provider" | null;
};

function persistedReconOutcome(value: string | null): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text || TOTALS_STATUS_WORDS.has(text)) return null;
  return text;
}

function samePeriod(left: string, right: string): boolean {
  return left.slice(0, 10) === right.slice(0, 10);
}

function atOrAfter(completedAt: string | null, verifiedAt: string): boolean {
  if (!completedAt) return false;
  const completedMs = Date.parse(completedAt);
  const verifiedMs = Date.parse(verifiedAt);
  if (!Number.isFinite(completedMs) || !Number.isFinite(verifiedMs)) return false;
  return completedMs >= verifiedMs;
}

function glDetailCents(row: PostWriteTieOutProofRow): number | null {
  const ending = integerCents(row.endingBalanceCents);
  const subledger = integerCents(row.subledgerTotalCents);
  if (ending != null && subledger != null) {
    return ending === subledger ? ending : null;
  }
  return ending ?? subledger;
}

function emptyRecon(): PostWriteReconEvidence {
  return { outcome: null, residualDeltaCents: null, authoritative: false };
}

/**
 * Sync-backed AR/AP/inventory outcomes come from recon_outcome and
 * unidentified_residual_cents on the completed run bound to the post-write
 * sync. totals_status is not copied. BS GL endings come from the live-provider
 * artifact ending or subledger total, never from TB comparison columns.
 */
export function applyPostWriteProofRows(args: {
  evidence: PostWriteCanonicalEvidence;
  accountingSyncId: string;
  engagementId: string;
  periodEnd: string;
  verifiedAt: string;
  slots: {
    ar: PostWriteProofSlot;
    ap: PostWriteProofSlot;
    inventory: PostWriteProofSlot;
  };
  rows: readonly PostWriteTieOutProofRow[];
}): PostWriteCanonicalEvidence {
  const reconEvidence: Record<string, PostWriteReconEvidence> = {
    ...args.evidence.reconEvidence,
  };

  for (const name of ["ar", "ap", "inventory"] as const) {
    const kind = SYNC_BACKED_KINDS[name];
    const slot = args.slots[name];
    const runId = String(slot.runId || "").trim();
    const row = args.rows.find((candidate) => candidate.id === runId);
    const accepted =
      Boolean(row) &&
      slot.authoritative &&
      slot.measurementSource === "persisted_sync_snapshot" &&
      row!.status === "completed" &&
      row!.tieOutKind === kind &&
      row!.engagementId === args.engagementId &&
      samePeriod(row!.periodEnd, args.periodEnd) &&
      row!.baselineSyncId === args.accountingSyncId;
    if (!accepted || !row) {
      reconEvidence[kind] = emptyRecon();
      continue;
    }
    reconEvidence[kind] = {
      outcome: persistedReconOutcome(row.reconOutcome),
      residualDeltaCents: integerCents(row.unidentifiedResidualCents),
      authoritative: true,
    };
  }

  const endings = new Map<string, Set<number>>();
  for (const row of args.rows) {
    if (row.tieOutKind !== "bs_account_recon") continue;
    if (row.status !== "completed") continue;
    if (row.engagementId !== args.engagementId) continue;
    if (!samePeriod(row.periodEnd, args.periodEnd)) continue;
    if (row.baselineSyncId != null) continue;
    if (!row.totalsStatus || !row.totalsStatus.trim()) continue;
    const accountId = String(row.qboAccountId || "").trim();
    if (!accountId || isQuickBooksReportEntityId(accountId)) continue;
    if (!atOrAfter(row.completedAt, args.verifiedAt)) continue;
    const ending = glDetailCents(row);
    if (ending == null) continue;
    const group = endings.get(accountId) || new Set<number>();
    group.add(ending);
    endings.set(accountId, group);
  }

  const glDetailEndingCents: Record<string, number> = {};
  for (const [accountId, group] of endings) {
    if (group.size !== 1) continue;
    glDetailEndingCents[accountId] = [...group][0];
  }

  return {
    ...args.evidence,
    reconEvidence,
    glDetailEndingCents,
  };
}
