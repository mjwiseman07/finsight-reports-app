/**
 * D3 QBO entity → LearnedLine[] normalizers. Pure functions.
 *
 * Each returns one LearnedLine per posting with a resolvable account_id; lines
 * without an account_id are skipped (per spec §3). Amounts are always positive;
 * the debit/credit direction is carried in posting_type.
 */
import type { LearnedLine, TxnType } from "./types";

type Ref = { value?: string; name?: string } | undefined;
interface QBOEntity {
  Id?: string;
  TxnDate?: string;
  TotalAmt?: number;
  [key: string]: unknown;
}

function refId(ref: Ref): string | undefined {
  return ref?.value || undefined;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pull the AccountRef from whichever line-detail shape a QBO line uses. */
function lineAccount(line: Record<string, unknown>): { id?: string; name?: string } {
  const detail =
    (line.AccountBasedExpenseLineDetail as Record<string, unknown> | undefined) ??
    (line.JournalEntryLineDetail as Record<string, unknown> | undefined) ??
    (line.DepositLineDetail as Record<string, unknown> | undefined) ??
    (line.ItemBasedExpenseLineDetail as Record<string, unknown> | undefined);
  const ref = detail?.AccountRef as Ref;
  return { id: ref?.value, name: ref?.name };
}

function entityRef(detail: Record<string, unknown> | undefined): {
  vendor_id?: string;
  vendor_name?: string;
  customer_id?: string;
} {
  const entity = detail?.Entity as { Type?: string; EntityRef?: Ref } | undefined;
  if (!entity?.EntityRef?.value) return {};
  if (entity.Type === "Customer") {
    return { customer_id: entity.EntityRef.value };
  }
  if (entity.Type === "Vendor" || !entity.Type) {
    return { vendor_id: entity.EntityRef.value, vendor_name: entity.EntityRef.name };
  }
  return {};
}

function base(p: QBOEntity, txn_type: TxnType) {
  return {
    txn_type,
    txn_id: String(p.Id ?? ""),
    txn_date: String(p.TxnDate ?? ""),
  };
}

export function purchaseToLines(p: QBOEntity): LearnedLine[] {
  const lines: LearnedLine[] = [];
  const b = base(p, "Purchase");

  // Vendor from the top-level EntityRef (unless it is a Customer/Employee).
  const topEntity = p.EntityRef as { type?: string; value?: string; name?: string } | undefined;
  const vendor =
    topEntity?.value && (!topEntity.type || topEntity.type === "Vendor")
      ? { vendor_id: topEntity.value, vendor_name: topEntity.name }
      : {};

  // Debit side: one line per expense line.
  for (const line of (p.Line as Record<string, unknown>[]) ?? []) {
    const acct = lineAccount(line);
    if (!acct.id) continue;
    lines.push({
      ...b,
      ...vendor,
      account_id: acct.id,
      account_name: acct.name,
      amount: Math.abs(num(line.Amount)),
      posting_type: "Debit",
    });
  }

  // Credit side: the top-level account (bank / credit card) for the total.
  const creditAcct = refId(p.AccountRef as Ref);
  if (creditAcct) {
    lines.push({
      ...b,
      ...vendor,
      account_id: creditAcct,
      account_name: (p.AccountRef as Ref)?.name,
      amount: Math.abs(num(p.TotalAmt)),
      posting_type: "Credit",
    });
  }

  return lines;
}

export function billToLines(bill: QBOEntity): LearnedLine[] {
  const lines: LearnedLine[] = [];
  const b = base(bill, "Bill");
  const vendorRef = bill.VendorRef as Ref;
  const vendor = vendorRef?.value
    ? { vendor_id: vendorRef.value, vendor_name: vendorRef.name }
    : {};

  for (const line of (bill.Line as Record<string, unknown>[]) ?? []) {
    const acct = lineAccount(line);
    if (!acct.id) continue;
    lines.push({
      ...b,
      ...vendor,
      account_id: acct.id,
      account_name: acct.name,
      amount: Math.abs(num(line.Amount)),
      posting_type: "Debit",
    });
  }

  // Credit side: Accounts Payable, when the bill carries an explicit AP ref.
  const apAcct = refId(bill.APAccountRef as Ref);
  if (apAcct) {
    lines.push({
      ...b,
      ...vendor,
      account_id: apAcct,
      account_name: (bill.APAccountRef as Ref)?.name,
      amount: Math.abs(num(bill.TotalAmt)),
      posting_type: "Credit",
    });
  }

  return lines;
}

export function journalEntryToLines(je: QBOEntity): LearnedLine[] {
  const lines: LearnedLine[] = [];
  const b = base(je, "JournalEntry");

  for (const line of (je.Line as Record<string, unknown>[]) ?? []) {
    const detail = line.JournalEntryLineDetail as Record<string, unknown> | undefined;
    const acct = detail?.AccountRef as Ref;
    if (!acct?.value) continue;
    const posting = detail?.PostingType === "Credit" ? "Credit" : "Debit";
    lines.push({
      ...b,
      ...entityRef(detail),
      account_id: acct.value,
      account_name: acct.name,
      amount: Math.abs(num(line.Amount)),
      posting_type: posting,
      class_id: refId((detail?.ClassRef as Ref) ?? undefined),
    });
  }

  return lines;
}

export function invoiceToLines(inv: QBOEntity): LearnedLine[] {
  const lines: LearnedLine[] = [];
  const b = base(inv, "Invoice");
  const customerRef = inv.CustomerRef as Ref;
  const customer = customerRef?.value ? { customer_id: customerRef.value } : {};

  // Invoice sales lines reference an Item, not an income Account, so an
  // account_id is usually unavailable. Emit only lines that expose an
  // AccountRef (skip the rest per spec).
  for (const line of (inv.Line as Record<string, unknown>[]) ?? []) {
    const acct = lineAccount(line);
    if (!acct.id) continue;
    lines.push({
      ...b,
      ...customer,
      account_id: acct.id,
      account_name: acct.name,
      amount: Math.abs(num(line.Amount)),
      posting_type: "Credit",
    });
  }

  return lines;
}

export function depositToLines(dep: QBOEntity): LearnedLine[] {
  const lines: LearnedLine[] = [];
  const b = base(dep, "Deposit");

  // Credit side: one line per deposit line (income / other account).
  for (const line of (dep.Line as Record<string, unknown>[]) ?? []) {
    const detail = line.DepositLineDetail as Record<string, unknown> | undefined;
    const acct = detail?.AccountRef as Ref;
    if (!acct?.value) continue;
    lines.push({
      ...b,
      ...entityRef(detail),
      account_id: acct.value,
      account_name: acct.name,
      amount: Math.abs(num(line.Amount)),
      posting_type: "Credit",
    });
  }

  // Debit side: the deposit-to (bank) account for the total.
  const depositTo = refId(dep.DepositToAccountRef as Ref);
  if (depositTo) {
    lines.push({
      ...b,
      account_id: depositTo,
      account_name: (dep.DepositToAccountRef as Ref)?.name,
      amount: Math.abs(num(dep.TotalAmt)),
      posting_type: "Debit",
    });
  }

  return lines;
}

export function normalizeEntity(txnType: TxnType, entity: QBOEntity): LearnedLine[] {
  switch (txnType) {
    case "Purchase":
      return purchaseToLines(entity);
    case "Bill":
      return billToLines(entity);
    case "JournalEntry":
      return journalEntryToLines(entity);
    case "Invoice":
      return invoiceToLines(entity);
    case "Deposit":
      return depositToLines(entity);
    default:
      return [];
  }
}
