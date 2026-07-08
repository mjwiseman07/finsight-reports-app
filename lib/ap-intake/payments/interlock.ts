/**
 * Phase D6.5 Part 2 — Block 8a — L9 No-Overpay Payment-Time Interlock.
 */
import type { GLBudgetSnapshotEntry, PerVendorNetPosition } from "./types";

export interface InterlockInputLine {
  vendor_id: string;
  gross_amount_cents: number;
  applied_credit_cents: number;
  applied_prepayment_cents: number;
  net_amount_cents: number;
  gl_account_code: string | null;
  period_year: number;
  period_month: number;
}

export interface InterlockVendorCommitmentInput {
  vendor_id: string;
  requisition_remaining_cents: number | null;
  annual_commitment_remaining_cents: number | null;
}

export interface InterlockGLBudgetInput {
  gl_account_code: string;
  period_year: number;
  period_month: number;
  budget_amount_cents: number;
  tolerance_pct: number;
  already_committed_cents: number;
}

export interface InterlockDecision {
  passed: boolean;
  per_vendor: PerVendorNetPosition[];
  gl_budget_snapshot: GLBudgetSnapshotEntry[];
  reason_codes: string[];
}

export function computeInterlock(args: {
  lines: InterlockInputLine[];
  vendor_commitments: InterlockVendorCommitmentInput[];
  gl_budgets: InterlockGLBudgetInput[];
}): InterlockDecision {
  const { lines, vendor_commitments, gl_budgets } = args;
  const perVendorMap = new Map<
    string,
    { gross: number; credit: number; prepay: number; net: number }
  >();
  for (const line of lines) {
    const cur = perVendorMap.get(line.vendor_id) ?? {
      gross: 0,
      credit: 0,
      prepay: 0,
      net: 0,
    };
    cur.gross += line.gross_amount_cents;
    cur.credit += line.applied_credit_cents;
    cur.prepay += line.applied_prepayment_cents;
    cur.net += line.net_amount_cents;
    perVendorMap.set(line.vendor_id, cur);
  }
  const commitmentByVendor = new Map<string, InterlockVendorCommitmentInput>();
  for (const c of vendor_commitments) commitmentByVendor.set(c.vendor_id, c);
  const perVendor: PerVendorNetPosition[] = [];
  const reasonCodesGlobal: string[] = [];
  for (const [vendorId, totals] of perVendorMap.entries()) {
    const commitment = commitmentByVendor.get(vendorId);
    const reasons: string[] = [];
    let passes = true;
    if (commitment?.requisition_remaining_cents != null) {
      if (totals.net > commitment.requisition_remaining_cents) {
        passes = false;
        reasons.push("requisition_remaining_exceeded");
      }
    }
    if (commitment?.annual_commitment_remaining_cents != null) {
      if (totals.net > commitment.annual_commitment_remaining_cents) {
        passes = false;
        reasons.push("annual_commitment_exceeded");
      }
    }
    if (!passes) reasonCodesGlobal.push(...reasons);
    perVendor.push({
      vendor_id: vendorId,
      gross_cents: totals.gross,
      applied_credit_cents: totals.credit,
      applied_prepayment_cents: totals.prepay,
      net_cents: totals.net,
      requisition_remaining_cents: commitment?.requisition_remaining_cents ?? null,
      vendor_annual_commitment_remaining_cents:
        commitment?.annual_commitment_remaining_cents ?? null,
      passes,
      reason_codes: reasons,
    });
  }
  const glMap = new Map<
    string,
    {
      gl_account_code: string;
      period_year: number;
      period_month: number;
      in_batch: number;
    }
  >();
  for (const line of lines) {
    if (!line.gl_account_code) continue;
    const key = `${line.gl_account_code}|${line.period_year}|${line.period_month}`;
    const cur = glMap.get(key) ?? {
      gl_account_code: line.gl_account_code,
      period_year: line.period_year,
      period_month: line.period_month,
      in_batch: 0,
    };
    cur.in_batch += line.net_amount_cents;
    glMap.set(key, cur);
  }
  const budgetByKey = new Map<string, InterlockGLBudgetInput>();
  for (const b of gl_budgets) {
    const key = `${b.gl_account_code}|${b.period_year}|${b.period_month}`;
    budgetByKey.set(key, b);
  }
  const glSnapshot: GLBudgetSnapshotEntry[] = [];
  for (const [, entry] of glMap.entries()) {
    const key = `${entry.gl_account_code}|${entry.period_year}|${entry.period_month}`;
    const budget = budgetByKey.get(key);
    if (!budget) {
      glSnapshot.push({
        gl_account_code: entry.gl_account_code,
        period_year: entry.period_year,
        period_month: entry.period_month,
        budget_cents: 0,
        in_batch_cents: entry.in_batch,
        tolerance_pct: 0,
        passes: true,
      });
      continue;
    }
    const toleranceMultiplier = 1 + budget.tolerance_pct / 100;
    const remaining = Math.floor(
      budget.budget_amount_cents * toleranceMultiplier - budget.already_committed_cents,
    );
    const passes = entry.in_batch <= remaining;
    if (!passes) {
      reasonCodesGlobal.push(
        `gl_budget_exceeded:${entry.gl_account_code}:${entry.period_year}-${entry.period_month}`,
      );
    }
    glSnapshot.push({
      gl_account_code: entry.gl_account_code,
      period_year: entry.period_year,
      period_month: entry.period_month,
      budget_cents: budget.budget_amount_cents,
      in_batch_cents: entry.in_batch,
      tolerance_pct: budget.tolerance_pct,
      passes,
    });
  }
  const allVendorsPass = perVendor.every((p) => p.passes);
  const allGLPass = glSnapshot.every((g) => g.passes);
  const passed = allVendorsPass && allGLPass;
  return {
    passed,
    per_vendor: perVendor,
    gl_budget_snapshot: glSnapshot,
    reason_codes: reasonCodesGlobal,
  };
}
