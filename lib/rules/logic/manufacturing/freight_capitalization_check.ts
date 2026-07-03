import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { findJournalEntries } from "@/lib/qbo-rest";
import {
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  suppress,
} from "./_helpers";

export const RULE_ID = "mfg.freight_capitalization_check";
export const RULE_VERSION = 1;

interface FreightPolicy {
  threshold_amount?: number;
  materiality_pct?: number;
}

interface QBOJournalLine {
  Amount?: number;
  Description?: string;
  JournalEntryLineDetail?: {
    PostingType?: string;
    AccountRef?: { value?: string; name?: string };
  };
}

interface QBOJournalEntry {
  Id: string;
  TxnDate?: string;
  Line?: QBOJournalLine[];
}

function isFreightLine(line: QBOJournalLine): boolean {
  const desc = (line.Description ?? "").toLowerCase();
  const acct = (line.JournalEntryLineDetail?.AccountRef?.name ?? "").toLowerCase();
  return desc.includes("freight") || acct.includes("freight");
}

function isExpenseAccount(line: QBOJournalLine): boolean {
  const acct = (line.JournalEntryLineDetail?.AccountRef?.name ?? "").toLowerCase();
  return (
    acct.includes("expense") ||
    acct.includes("freight") ||
    acct.includes("shipping") ||
    (!acct.includes("inventory") && !acct.includes("asset"))
  );
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const policy = (await loadMemoryPayload(ctx, "mfg.freight_capitalization_policy")) as
      | FreightPolicy
      | null;
    if (!policy || policy.threshold_amount == null) {
      return suppress("no_freight_capitalization_policy");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOJournalEntry[];

    const findings: Array<{ jeId: string; amount: number; accountName: string | undefined }> = [];
    for (const je of jes ?? []) {
      for (const line of je.Line ?? []) {
        const amount = line.Amount ?? 0;
        if (amount < policy.threshold_amount) continue;
        if (!isFreightLine(line)) continue;
        if (!isExpenseAccount(line)) continue;
        findings.push({
          jeId: je.Id,
          amount,
          accountName: line.JournalEntryLineDetail?.AccountRef?.name,
        });
      }
    }

    if (findings.length === 0) {
      return suppress("no_qualifying_freight_expense", { threshold: policy.threshold_amount });
    }

    if (findings.length <= 10) {
      return fire("freight_expensed_not_capitalized", {
        count: findings.length,
        threshold: policy.threshold_amount,
        findings,
        period: { start, end },
      });
    }

    return fire("freight_expensed_not_capitalized", {
      count: findings.length,
      threshold: policy.threshold_amount,
      rolled_up: true,
      sample: findings.slice(0, 10),
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
