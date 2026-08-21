/**
 * JE-1 double-entry, control-account, and class validation.
 * Fail closed. No provider write.
 */

import type {
  JeExpectedEffect,
  JeProposalAccountMeta,
  JeProposalLine,
  JeProposalOriginType,
  JeProposalPolicy,
} from "./types";
import { JE_PROPOSAL_ERROR } from "./types";

export class JeProposalValidationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeProposalValidationError";
    this.code = code;
  }
}

const CONTROL_TYPE_AR = new Set(["AccountsReceivable"]);
const CONTROL_TYPE_AP = new Set(["AccountsPayable"]);
const CONTROL_TYPE_INVENTORY = new Set(["Inventory"]);

function isIntegerCents(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function normalizeCurrency(currency: string): string {
  return String(currency || "").trim().toUpperCase();
}

export function validateCurrency(currency: string): string {
  const normalized = normalizeCurrency(currency);
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.CURRENCY_INVALID,
      "currency must be a 3-letter ISO code.",
    );
  }
  return normalized;
}

export function validateAndNormalizeLines(
  lines: readonly JeProposalLine[],
  policy: JeProposalPolicy,
): { lines: JeProposalLine[]; totalDebitsCents: number; totalCreditsCents: number } {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.LINES_EMPTY,
      "At least one JE line is required.",
    );
  }
  if (lines.length < 2) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.LINES_EMPTY,
      "JE proposals require at least two lines.",
    );
  }
  if (lines.length > policy.maxLines) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.LINES_TOO_MANY,
      `JE line count exceeds maxLines=${policy.maxLines}.`,
    );
  }

  const sequences = lines.map((l) => l.sequence);
  const sorted = [...sequences].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (!Number.isInteger(sorted[i]) || sorted[i] !== i + 1) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_SEQUENCE_INVALID,
        "Line sequences must be contiguous integers starting at 1.",
      );
    }
  }
  if (new Set(sequences).size !== sequences.length) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.LINE_SEQUENCE_INVALID,
      "Duplicate line sequences are not allowed.",
    );
  }

  let totalDebits = 0;
  let totalCredits = 0;
  const normalized: JeProposalLine[] = [];

  for (const raw of [...lines].sort((a, b) => a.sequence - b.sequence)) {
    const accountId = String(raw.accountId || "").trim();
    if (!accountId) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_ACCOUNT_REQUIRED,
        `Line ${raw.sequence} requires accountId.`,
      );
    }
    if (!isIntegerCents(raw.debitCents) || !isIntegerCents(raw.creditCents)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_NON_INTEGER,
        `Line ${raw.sequence} amounts must be integer cents.`,
      );
    }
    if (raw.debitCents < 0 || raw.creditCents < 0) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_NEGATIVE,
        `Line ${raw.sequence} cannot have negative debit/credit.`,
      );
    }
    if (raw.debitCents > 0 && raw.creditCents > 0) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_BOTH_SIDES,
        `Line ${raw.sequence} cannot have both debit and credit.`,
      );
    }
    if (raw.debitCents === 0 && raw.creditCents === 0) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.LINE_ZERO_SIDES,
        `Line ${raw.sequence} must have exactly one non-zero side.`,
      );
    }
    const description =
      raw.description == null || raw.description === ""
        ? null
        : String(raw.description);
    if (description && description.length > policy.maxLineDescriptionChars) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.DESCRIPTION_TOO_LONG,
        `Line ${raw.sequence} description exceeds limit.`,
      );
    }
    totalDebits += raw.debitCents;
    totalCredits += raw.creditCents;
    normalized.push({
      sequence: raw.sequence,
      accountId,
      description,
      debitCents: raw.debitCents,
      creditCents: raw.creditCents,
      classId: raw.classId ? String(raw.classId) : null,
      departmentId: raw.departmentId ? String(raw.departmentId) : null,
      locationId: raw.locationId ? String(raw.locationId) : null,
    });
  }

  if (totalDebits <= 0 || totalCredits <= 0) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.ZERO_TOTAL,
      "JE totals must be greater than zero.",
    );
  }
  if (totalDebits !== totalCredits) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.UNBALANCED,
      "Total debits must equal total credits exactly.",
    );
  }
  if (
    policy.maxProposalAmountCents != null &&
    totalDebits > policy.maxProposalAmountCents
  ) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.AMOUNT_EXCEEDS_MAX,
      "Proposal amount exceeds policy maxProposalAmountCents.",
    );
  }

  return {
    lines: normalized,
    totalDebitsCents: totalDebits,
    totalCreditsCents: totalCredits,
  };
}

export function validateMemo(
  memo: string | null | undefined,
  policy: JeProposalPolicy,
): string | null {
  if (memo == null || memo === "") return null;
  const text = String(memo);
  if (text.length > policy.maxMemoChars) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.MEMO_TOO_LONG,
      "Memo exceeds policy maxMemoChars.",
    );
  }
  return text;
}

export function validateExpectedEffects(
  effects: readonly JeExpectedEffect[],
  policy: JeProposalPolicy,
): JeExpectedEffect[] {
  if (policy.requireExpectedEffects && (!effects || effects.length === 0)) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.EFFECTS_REQUIRED,
      "expectedEffects are required by policy.",
    );
  }
  const out: JeExpectedEffect[] = [];
  for (const effect of effects || []) {
    if (!effect || typeof effect !== "object" || !("type" in effect)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.EFFECTS_INVALID,
        "expectedEffects entry is invalid.",
      );
    }
    switch (effect.type) {
      case "CC_EXCEPTION_CLEAR":
        if (!String(effect.exceptionCode || "").trim()) {
          throw new JeProposalValidationError(
            JE_PROPOSAL_ERROR.EFFECTS_INVALID,
            "CC_EXCEPTION_CLEAR requires exceptionCode.",
          );
        }
        out.push({
          type: "CC_EXCEPTION_CLEAR",
          exceptionCode: String(effect.exceptionCode).trim(),
        });
        break;
      case "RECON_OUTCOME_TARGET":
        if (
          !String(effect.reconKind || "").trim() ||
          !String(effect.targetOutcome || "").trim()
        ) {
          throw new JeProposalValidationError(
            JE_PROPOSAL_ERROR.EFFECTS_INVALID,
            "RECON_OUTCOME_TARGET requires reconKind and targetOutcome.",
          );
        }
        out.push({
          type: "RECON_OUTCOME_TARGET",
          reconKind: String(effect.reconKind).trim(),
          targetOutcome: String(effect.targetOutcome).trim(),
        });
        break;
      case "RESIDUAL_DELTA":
        if (
          !String(effect.reconKind || "").trim() ||
          !Number.isInteger(effect.expectedDeltaCents)
        ) {
          throw new JeProposalValidationError(
            JE_PROPOSAL_ERROR.EFFECTS_INVALID,
            "RESIDUAL_DELTA requires reconKind and integer expectedDeltaCents.",
          );
        }
        out.push({
          type: "RESIDUAL_DELTA",
          reconKind: String(effect.reconKind).trim(),
          expectedDeltaCents: effect.expectedDeltaCents,
        });
        break;
      case "ACCOUNT_RECLASS":
        if (
          !String(effect.fromAccountId || "").trim() ||
          !String(effect.toAccountId || "").trim() ||
          !Number.isInteger(effect.amountCents) ||
          effect.amountCents <= 0
        ) {
          throw new JeProposalValidationError(
            JE_PROPOSAL_ERROR.EFFECTS_INVALID,
            "ACCOUNT_RECLASS requires from/to accounts and positive amountCents.",
          );
        }
        out.push({
          type: "ACCOUNT_RECLASS",
          fromAccountId: String(effect.fromAccountId).trim(),
          toAccountId: String(effect.toAccountId).trim(),
          amountCents: effect.amountCents,
        });
        break;
      default:
        throw new JeProposalValidationError(
          JE_PROPOSAL_ERROR.EFFECTS_INVALID,
          "Unsupported expectedEffects type.",
        );
    }
  }
  return out;
}

export function isInventoryControlAccountType(
  accountType: string,
  accountSubtype: string | null,
): boolean {
  const type = String(accountType || "").trim();
  const subtype = String(accountSubtype || "").trim();
  if (CONTROL_TYPE_INVENTORY.has(type)) return true;
  if (type === "Other Current Asset" && subtype === "Inventory") return true;
  return false;
}

export function rejectControlAccounts(args: {
  lines: readonly JeProposalLine[];
  accounts: Map<string, JeProposalAccountMeta>;
  engagementControlAccountIds: {
    ar: string | null;
    ap: string | null;
    inventory: string | null;
  };
  policy: JeProposalPolicy;
}): void {
  for (const line of args.lines) {
    const id = line.accountId;
    if (
      args.engagementControlAccountIds.ar &&
      id === args.engagementControlAccountIds.ar
    ) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_AR,
        "Direct posting to AR control account is prohibited in JE-1.",
      );
    }
    if (
      args.engagementControlAccountIds.ap &&
      id === args.engagementControlAccountIds.ap
    ) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_AP,
        "Direct posting to AP control account is prohibited in JE-1.",
      );
    }
    if (
      args.engagementControlAccountIds.inventory &&
      id === args.engagementControlAccountIds.inventory
    ) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_INVENTORY,
        "Direct posting to Inventory control account is prohibited in JE-1.",
      );
    }
    if (args.policy.prohibitedAccountIds.includes(id)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.ACCOUNT_TYPE_PROHIBITED,
        `Account ${id} is prohibited by proposal policy.`,
      );
    }

    const meta = args.accounts.get(id);
    if (!meta) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND,
        `Account ${id} was not found in the authoritative account catalog.`,
      );
    }
    if (!meta.active) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.ACCOUNT_INACTIVE,
        `Account ${id} is inactive.`,
      );
    }
    const type = String(meta.accountType || "");
    if (CONTROL_TYPE_AR.has(type)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_AR,
        "QBO AccountsReceivable account type is prohibited in JE-1.",
      );
    }
    if (CONTROL_TYPE_AP.has(type)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_AP,
        "QBO AccountsPayable account type is prohibited in JE-1.",
      );
    }
    if (isInventoryControlAccountType(type, meta.accountSubtype)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CONTROL_ACCOUNT_INVENTORY,
        "QBO Inventory account type/subtype is prohibited in JE-1.",
      );
    }
    if (args.policy.prohibitedControlAccountTypes.includes(type)) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.ACCOUNT_TYPE_PROHIBITED,
        `Account type ${type} is prohibited by proposal policy.`,
      );
    }
  }
}

function typesOf(
  lines: readonly JeProposalLine[],
  accounts: Map<string, JeProposalAccountMeta>,
): string[] {
  return lines.map((l) => {
    const meta = accounts.get(l.accountId);
    if (!meta) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.ACCOUNT_NOT_FOUND,
        `Account ${l.accountId} missing for class validation.`,
      );
    }
    return String(meta.accountType || "");
  });
}

export function validateOriginClass(args: {
  originType: JeProposalOriginType;
  lines: readonly JeProposalLine[];
  accounts: Map<string, JeProposalAccountMeta>;
  policy: JeProposalPolicy;
}): void {
  if (!args.policy.allowedOriginTypes.includes(args.originType)) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.ORIGIN_UNSUPPORTED,
      `originType ${args.originType} is not allowed by policy.`,
    );
  }
  const types = typesOf(args.lines, args.accounts);
  if (args.originType === "ACCRUAL") {
    const pl = new Set(args.policy.accrualPlAccountTypes);
    const liab = new Set(args.policy.accrualLiabilityAccountTypes);
    const hasPl = types.some((t) => pl.has(t));
    const hasLiab = types.some((t) => liab.has(t));
    const allAllowed = types.every((t) => pl.has(t) || liab.has(t));
    if (!hasPl || !hasLiab || !allAllowed) {
      throw new JeProposalValidationError(
        JE_PROPOSAL_ERROR.CLASS_NOT_ALLOWED,
        "ACCRUAL requires P&L ↔ non-control liability account types only.",
      );
    }
    return;
  }

  // RECLASS
  const pl = new Set(args.policy.reclassPlAccountTypes);
  const bs = new Set(args.policy.reclassBsAccountTypes);
  const allPl = types.every((t) => pl.has(t));
  const allBs = types.every((t) => bs.has(t));
  if (!allPl && !allBs) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.CLASS_NOT_ALLOWED,
      "RECLASS requires all P&L ↔ P&L or all non-control BS ↔ BS account types.",
    );
  }
}

export function assertTxnDateInPeriod(args: {
  txnDate: string;
  periodEnd: string;
  periodStart: string | null;
  allowCrossPeriod: false;
}): void {
  const txn = String(args.txnDate || "").slice(0, 10);
  const end = String(args.periodEnd || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txn)) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.CROSS_PERIOD,
      "txnDate must be YYYY-MM-DD.",
    );
  }
  if (args.allowCrossPeriod !== false) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.CROSS_PERIOD,
      "Cross-period posting is not allowed in JE-1.",
    );
  }
  // Derive month bounds from period_end when period_start unavailable.
  const start =
    args.periodStart && /^\d{4}-\d{2}-\d{2}$/.test(args.periodStart)
      ? args.periodStart.slice(0, 10)
      : `${end.slice(0, 8)}01`;
  if (txn < start || txn > end) {
    throw new JeProposalValidationError(
      JE_PROPOSAL_ERROR.CROSS_PERIOD,
      "txnDate must fall within the source Continuous Close period.",
    );
  }
}
