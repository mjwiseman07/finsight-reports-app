// D6.4b: Canonical shape of the AP Accrual Manifest memory record payload.
// This IS the schema — no drift allowed. D6.4c's line-matched-check rule
// reads records that conform to this exact shape.

export const AP_ACCRUAL_MANIFEST_SCHEMA_VERSION = 1 as const;

export interface ApAccrualManifestLine {
  /** 0-based index matching the JE line_index this manifest entry corresponds to. */
  lineIndex: number;
  /** Raw vendor name as booked (human-readable, unchanged from input). */
  vendorName: string;
  /** Vendor ID from QBO if known; null for one-off vendors. */
  vendorId: string | null;
  /** Canonicalized vendor name (see canonicalize.ts). Used for D6.4c matching. */
  vendorCanonical: string;
  /** Raw invoice number as booked. */
  invoiceNumber: string;
  /** Canonicalized invoice number. Used for D6.4c matching. */
  invoiceNumberCanonical: string;
  /** ISO date of the invoice (not the post date of the accrual JE). */
  invoiceDate: string;
  /** Dollar amount accrued for this line (always positive). */
  amount: number;
  /** Expense account this line debits. */
  expenseAccountId: string;
  expenseAccountName: string;
  /** Accrued-AP account this line credits (usually one shared account). */
  accruedApAccountId: string;
  accruedApAccountName: string;
  /** Free-form memo captured at booking. */
  memo: string | null;
  /** Status — updated by D6.4c when this line's real bill arrives. */
  matchStatus: "open" | "matched" | "reversed" | "stale";
  matchedBillId: string | null;
  matchedAt: string | null;
  reversedAttemptId: string | null;
}

export interface ApAccrualManifestPayload {
  schemaVersion: typeof AP_ACCRUAL_MANIFEST_SCHEMA_VERSION;
  firmClientId: string;
  companyId: string;
  closePeriodId: string;
  periodStart: string;
  periodEnd: string;
  bookedAttemptId: string;
  bookedAt: string;
  bookedByUserId: string | null;
  totalAccrued: number;
  accruedApAccountId: string;
  accruedApAccountName: string;
  lines: ApAccrualManifestLine[];
}

export class ManifestSchemaError extends Error {
  constructor(
    msg: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(msg);
    this.name = "ManifestSchemaError";
  }
}

export function validateManifest(payload: unknown): asserts payload is ApAccrualManifestPayload {
  if (!payload || typeof payload !== "object") {
    throw new ManifestSchemaError("payload must be an object", { payload });
  }
  const p = payload as Record<string, unknown>;
  if (p.schemaVersion !== AP_ACCRUAL_MANIFEST_SCHEMA_VERSION) {
    throw new ManifestSchemaError("schemaVersion mismatch", { got: p.schemaVersion });
  }
  const req = [
    "firmClientId",
    "companyId",
    "closePeriodId",
    "periodStart",
    "periodEnd",
    "bookedAttemptId",
    "bookedAt",
    "totalAccrued",
    "accruedApAccountId",
    "accruedApAccountName",
    "lines",
  ];
  for (const k of req) {
    if (p[k] === undefined || p[k] === null) {
      throw new ManifestSchemaError(`missing ${k}`, { key: k });
    }
  }
  if (!Array.isArray(p.lines) || p.lines.length === 0) {
    throw new ManifestSchemaError("lines must be non-empty array", {});
  }
  let sum = 0;
  for (const [i, line] of (p.lines as unknown[]).entries()) {
    validateLine(line, i);
    sum += (line as ApAccrualManifestLine).amount;
  }
  if (Math.abs(sum - (p.totalAccrued as number)) > 0.005) {
    throw new ManifestSchemaError("totalAccrued does not match sum(lines[].amount)", {
      totalAccrued: p.totalAccrued,
      sum,
    });
  }
}

function validateLine(line: unknown, i: number): void {
  if (!line || typeof line !== "object") {
    throw new ManifestSchemaError(`line[${i}] not an object`, { i });
  }
  const l = line as Record<string, unknown>;
  const req = [
    "lineIndex",
    "vendorName",
    "vendorCanonical",
    "invoiceNumber",
    "invoiceNumberCanonical",
    "invoiceDate",
    "amount",
    "expenseAccountId",
    "expenseAccountName",
    "accruedApAccountId",
    "accruedApAccountName",
    "matchStatus",
  ];
  for (const k of req) {
    if (l[k] === undefined || l[k] === null) {
      throw new ManifestSchemaError(`line[${i}].${k} missing`, { i, key: k });
    }
  }
  if (typeof l.amount !== "number" || (l.amount as number) <= 0) {
    throw new ManifestSchemaError(`line[${i}].amount must be positive number`, {
      i,
      amount: l.amount,
    });
  }
  if (!["open", "matched", "reversed", "stale"].includes(l.matchStatus as string)) {
    throw new ManifestSchemaError(`line[${i}].matchStatus invalid`, { i, value: l.matchStatus });
  }
}
