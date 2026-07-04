/**
 * @rule       gen.subledger_tie_check
 * @assertions primary:completeness,accuracy | secondary:existence_occurrence
 * @accounts   accounts_receivable, accounts_payable, inventory
 * @citation   AICPA Audit Guide
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — lib/qbo-rest.js is untyped
import { reportBalanceSheet, qboReport } from "@/lib/qbo-rest";

export const RULE_ID = "gen.subledger_tie_check";
export const RULE_VERSION = 1;

const AR_ACCOUNT_TYPES = ["Accounts Receivable"];
const AP_ACCOUNT_TYPES = ["Accounts Payable"];

function toleranceFor(balance: number): number {
  return Math.max(1.0, Math.abs(balance) * 0.0001);
}

interface QBOReportRow {
  ColData?: Array<{ value?: string }>;
  Summary?: { ColData?: Array<{ value?: string }> };
  group?: string;
  type?: string;
  Rows?: { Row?: QBOReportRow[] };
}
interface QBOReport {
  Rows?: { Row?: QBOReportRow[] };
  Header?: { ReportName?: string; StartPeriod?: string; EndPeriod?: string };
}

function findControlBalance(report: QBOReport, accountTypeNames: string[]): number | null {
  const walk = (rows: QBOReportRow[] | undefined): number | null => {
    if (!rows) return null;
    for (const row of rows) {
      const label = row.ColData?.[0]?.value ?? row.group ?? "";
      if (accountTypeNames.some((t) => label.includes(t))) {
        const val = row.Summary?.ColData?.[1]?.value ?? row.ColData?.[1]?.value;
        if (val != null) return parseFloat(String(val).replace(/,/g, ""));
      }
      const nested = walk(row.Rows?.Row);
      if (nested != null) return nested;
    }
    return null;
  };
  return walk(report.Rows?.Row);
}

function findAgingTotal(report: QBOReport): number | null {
  const rows = report.Rows?.Row ?? [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const label = rows[i].Summary?.ColData?.[0]?.value ?? rows[i].ColData?.[0]?.value ?? "";
    if (label.toLowerCase().includes("total")) {
      const cols = rows[i].Summary?.ColData ?? rows[i].ColData ?? [];
      const totalVal = cols[cols.length - 1]?.value;
      if (totalVal != null) return parseFloat(String(totalVal).replace(/,/g, ""));
    }
  }
  return null;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  if (!ctx.qbo) {
    return {
      fired: false,
      outcome: "suppressed",
      reason_code: "qbo_unavailable",
      reason_detail: {},
    };
  }
  const { accessToken, realmId } = ctx.qbo;
  const endDate =
    (ctx.inputs.endDate as string | undefined) ?? new Date().toISOString().slice(0, 10);
  try {
    const [bs, arAging, apAging] = await Promise.all([
      reportBalanceSheet(accessToken, realmId, { end_date: endDate }) as Promise<QBOReport>,
      qboReport(accessToken, realmId, "AgedReceivables", {
        report_date: endDate,
      }) as Promise<QBOReport>,
      qboReport(accessToken, realmId, "AgedPayables", {
        report_date: endDate,
      }) as Promise<QBOReport>,
    ]);

    const arControl = findControlBalance(bs, AR_ACCOUNT_TYPES);
    const apControl = findControlBalance(bs, AP_ACCOUNT_TYPES);
    const arSub = findAgingTotal(arAging);
    const apSub = findAgingTotal(apAging);

    const failures: Array<{
      subledger: "AR" | "AP";
      control: number;
      sub: number;
      delta: number;
      tolerance: number;
    }> = [];

    if (arControl != null && arSub != null) {
      const delta = arControl - arSub;
      const tol = toleranceFor(arControl);
      if (Math.abs(delta) > tol) {
        failures.push({ subledger: "AR", control: arControl, sub: arSub, delta, tolerance: tol });
      }
    }
    if (apControl != null && apSub != null) {
      const delta = apControl - apSub;
      const tol = toleranceFor(apControl);
      if (Math.abs(delta) > tol) {
        failures.push({ subledger: "AP", control: apControl, sub: apSub, delta, tolerance: tol });
      }
    }

    if (failures.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "within_tolerance",
        reason_detail: { arControl, arSub, apControl, apSub, endDate },
      };
    }

    return {
      fired: true,
      outcome: "fired",
      reason_code: "subledger_out_of_tie",
      reason_detail: { failures, endDate },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      fired: false,
      outcome: "error",
      reason_code: "qbo_fetch_failed",
      reason_detail: { message },
    };
  }
}
