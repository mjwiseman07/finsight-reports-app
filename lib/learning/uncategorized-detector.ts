/**
 * D4 Path A — Uncategorized Detector (read-only).
 *
 * Enumerates transactions posted to junk-drawer accounts (Uncategorized
 * Expense/Income, Ask My Accountant). Pure read: queries QBO only, no DB
 * writes, no D2 calls, no proposal composition (that is Step 4/5).
 */
import { getQboForFirmClient } from "@/lib/qbo-for-firm-client.js";
import { qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import type { UncategorizedProposalTxnType } from "@/lib/learning/types-d4";

export type UncategorizedAccount = {
  account_id: string; // QBO Id
  account_name: string; // Name
  account_subtype: string; // AccountSubType (e.g., "UncategorizedExpense")
};

export type UncategorizedTxn = {
  txn_id: string;
  txn_type: UncategorizedProposalTxnType;
  txn_date: string; // YYYY-MM-DD
  txn_amount: number;
  txn_memo: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  current_account_id: string; // one of the uncategorized bucket ids
  current_account_name: string;
};

export type DetectorInput = {
  firmClientId: string;
  since?: string; // YYYY-MM-DD, default 90d ago
};

export type DetectorOutput = {
  uncategorized_accounts: UncategorizedAccount[];
  txns: UncategorizedTxn[];
  discovery_ms: number;
};

// QBO entities that actually support the query API. Note: QBO has no separate
// "Expense" query entity — UI "Expenses" are Purchase rows (cash/CC/check), so
// they surface under Purchase. 'Expense' remains in the txn_type union (DB
// CHECK) for future use.
const QUERY_ENTITIES: Array<{ entity: string; txnType: UncategorizedProposalTxnType }> = [
  { entity: "Purchase", txnType: "Purchase" },
  { entity: "Bill", txnType: "Bill" },
  { entity: "JournalEntry", txnType: "JournalEntry" },
  { entity: "Deposit", txnType: "Deposit" },
];

const PER_ENTITY_SLEEP_MS = 250;

function defaultSince(): string {
  return new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableQbo(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(msg) ||
    /too many requests/i.test(msg) ||
    /application error/i.test(msg)
  );
}

async function queryWithRetry(
  accessToken: string,
  realmId: string,
  sql: string,
  entityName: string,
): Promise<Record<string, unknown>[]> {
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return extractQueryEntities(await qboQuery(accessToken, realmId, sql), entityName);
    } catch (err) {
      lastErr = err;
      if (!isRetryableQbo(err) || attempt === maxAttempts) throw err;
      await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

type Ref = { value?: string; name?: string; type?: string } | undefined;

/** Extract the line-level GL account ref across QBO line-detail shapes. */
function lineAccountRef(line: Record<string, unknown>): Ref {
  const detail =
    (line.AccountBasedExpenseLineDetail as Record<string, unknown> | undefined) ??
    (line.JournalEntryLineDetail as Record<string, unknown> | undefined) ??
    (line.DepositLineDetail as Record<string, unknown> | undefined);
  return detail?.AccountRef as Ref;
}

/** Vendor from the txn or line, when present. */
function vendorFrom(
  txn: Record<string, unknown>,
  line: Record<string, unknown>,
): { vendor_id: string | null; vendor_name: string | null } {
  const top = (txn.EntityRef as Ref) ?? (txn.VendorRef as Ref);
  if (top?.value && (!top.type || top.type === "Vendor")) {
    return { vendor_id: top.value, vendor_name: top.name ?? null };
  }
  const lineDetail =
    (line.JournalEntryLineDetail as Record<string, unknown> | undefined) ??
    (line.DepositLineDetail as Record<string, unknown> | undefined);
  const entity = lineDetail?.Entity as { Type?: string; EntityRef?: Ref } | undefined;
  if (entity?.EntityRef?.value && (!entity.Type || entity.Type === "Vendor")) {
    return { vendor_id: entity.EntityRef.value, vendor_name: entity.EntityRef.name ?? null };
  }
  return { vendor_id: null, vendor_name: null };
}

// Canonical QBO subtypes for the system junk-drawer accounts. Filtered one at a
// time because QBO's query language rejects `IN` on AccountSubType (it only
// supports `=` there — verified against realm 9341457151063823).
const UNCATEGORIZED_SUBTYPES = ["UncategorizedExpense", "UncategorizedIncome"];

// QBO's default junk-drawer account names. Matched by EXACT full name (not a
// substring), so a customer account merely containing "Uncategorized" is not
// swept in. Required because some files (incl. the sandbox) carry generic
// subtypes on their junk-drawer accounts (e.g. "Uncategorized Expense" →
// OtherMiscellaneousServiceCost) that the subtype filter alone would miss.
const UNCATEGORIZED_NAMES = ["Uncategorized Expense", "Uncategorized Income", "Ask My Accountant"];

function escapeQboLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export async function findUncategorizedAccounts(
  accessToken: string,
  realmId: string,
): Promise<UncategorizedAccount[]> {
  // TODO(Step 4): expand via uncategorized_bucket_hint memory for renamed
  // junk-drawer accounts ("Ask CPA", "Uncategorized - Review", etc.).
  const byId = new Map<string, UncategorizedAccount>();

  const addRows = (rows: Record<string, unknown>[]) => {
    for (const a of rows) {
      const account_id = String(a.Id ?? "");
      if (!account_id) continue;
      byId.set(account_id, {
        account_id,
        account_name: String(a.Name ?? ""),
        account_subtype: String(a.AccountSubType ?? a.AccountType ?? ""),
      });
    }
  };

  // 1. Canonical subtype match (production QBO defaults). One query per subtype
  //    because QBO rejects `IN` on AccountSubType. Best-effort: some files reject
  //    the enum value entirely ("invalid or unsupported property") — that must
  //    not abort discovery, since the exact-name pass below is the reliable path.
  for (const subtype of UNCATEGORIZED_SUBTYPES) {
    const sql = `SELECT Id, Name, AccountType, AccountSubType FROM Account WHERE AccountSubType = '${subtype}' MAXRESULTS 100`;
    try {
      addRows(await queryWithRetry(accessToken, realmId, sql, "Account"));
    } catch (err) {
      if (!/invalid or unsupported property/i.test(err instanceof Error ? err.message : String(err))) {
        throw err;
      }
    }
  }

  // 2. Exact default-name match (catches files whose junk-drawer accounts carry
  //    generic subtypes, e.g. the sandbox). Name IN parses fine on QBO.
  const nameList = UNCATEGORIZED_NAMES.map((n) => `'${escapeQboLiteral(n)}'`).join(", ");
  const nameSql = `SELECT Id, Name, AccountType, AccountSubType FROM Account WHERE Name IN (${nameList}) MAXRESULTS 100`;
  addRows(await queryWithRetry(accessToken, realmId, nameSql, "Account"));

  return [...byId.values()];
}

export async function findUncategorizedTxns(input: DetectorInput): Promise<DetectorOutput> {
  const start = performance.now();
  const since = input.since ?? defaultSince();

  const { accessToken, realmId } = await getQboForFirmClient(input.firmClientId);

  const uncategorizedAccounts = await findUncategorizedAccounts(accessToken, realmId);
  if (uncategorizedAccounts.length === 0) {
    return {
      uncategorized_accounts: [],
      txns: [],
      discovery_ms: performance.now() - start,
    };
  }

  const bucketIds = new Set(uncategorizedAccounts.map((a) => a.account_id));
  const bucketNames = new Map(uncategorizedAccounts.map((a) => [a.account_id, a.account_name]));

  const txns: UncategorizedTxn[] = [];
  let first = true;
  for (const { entity, txnType } of QUERY_ENTITIES) {
    if (!first) await sleep(PER_ENTITY_SLEEP_MS);
    first = false;

    const sql = `SELECT * FROM ${entity} WHERE TxnDate >= '${since}' MAXRESULTS 1000`;
    const rows = await queryWithRetry(accessToken, realmId, sql, entity);

    for (const txn of rows) {
      const txnId = String(txn.Id ?? "");
      const txnDate = String(txn.TxnDate ?? "");
      const memo = (txn.PrivateNote as string) ?? null;
      const lines = (txn.Line as Record<string, unknown>[]) ?? [];

      // One row per hit line (faithful to the ledger; downstream dedupes).
      for (const line of lines) {
        const acctRef = lineAccountRef(line);
        if (!acctRef?.value || !bucketIds.has(acctRef.value)) continue;
        const { vendor_id, vendor_name } = vendorFrom(txn, line);
        txns.push({
          txn_id: txnId,
          txn_type: txnType,
          txn_date: txnDate,
          txn_amount: Math.abs(Number(line.Amount) || 0),
          txn_memo: memo,
          vendor_id,
          vendor_name,
          current_account_id: acctRef.value,
          current_account_name: bucketNames.get(acctRef.value) ?? acctRef.name ?? "",
        });
      }
    }
  }

  return {
    uncategorized_accounts: uncategorizedAccounts,
    txns,
    discovery_ms: performance.now() - start,
  };
}
