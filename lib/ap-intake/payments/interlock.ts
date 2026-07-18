/**
 * Phase D6.5 Part 2 — Block 8a — L9 No-Overpay Payment-Time Interlock.
 *
 * MC-4c (Issue #6, Gap C-3): Currency-aware. Vendor commitments and GL
 * budgets are home-currency denominated. Foreign-currency batch lines are
 * rejected — reject-not-convert policy (see MC-3, MC-4a, MC-4b).
 */
import type { GLBudgetSnapshotEntry, PerVendorNetPosition } from "./types";

export interface InterlockInputLine {
  vendor_id: string;
  currency: string; // MC-4c: ISO 4217 of the line
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
  home_currency: string; // MC-4c: entity home currency
  batch_currency: string; // MC-4c: parent batch currency
}): InterlockDecision {
  const { lines, vendor_commitments, gl_budgets, home_currency, batch_currency } = args;

  // MC-4c pre-flight: currency policy.
  const reasonCodesGlobal: string[] = [];
  let currencyPolicyPassed = true;

  if (!home_currency) {
    currencyPolicyPassed = false;
    reasonCodesGlobal.push("home_currency_unset");
  }

  if (home_currency && batch_currency && batch_currency !== home_currency) {
    // Batch itself is denominated in a foreign currency — same reject policy.
    currencyPolicyPassed = false;
    reasonCodesGlobal.push(`foreign_currency_batch_requires_fx:${batch_currency}`);
  }

  // Line-level currency checks. Deduplicate reason codes per offending currency.
  const foreignLineCurrencies = new Set<string>();
  const mismatchedLineCurrencies = new Set<string>();
  for (const line of lines) {
    if (!line.currency) {
      currencyPolicyPassed = false;
      reasonCodesGlobal.push("line_currency_unset");
      continue;
    }
    if (home_currency && line.currency !== home_currency) {
      foreignLineCurrencies.add(line.currency);
    }
    if (batch_currency && line.currency !== batch_currency) {
      mismatchedLineCurrencies.add(line.currency);
    }
  }
  for (const c of foreignLineCurrencies) {
    currencyPolicyPassed = false;
    reasonCodesGlobal.push(`foreign_currency_line_requires_fx:${c}`);
  }
  for (const c of mismatchedLineCurrencies) {
    currencyPolicyPassed = false;
    reasonCodesGlobal.push(`batch_line_currency_mismatch:${c}`);
  }

  // Per-vendor net position aggregation (unchanged arithmetic).
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

  // GL budget aggregation (unchanged arithmetic).
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
  const passed = currencyPolicyPassed && allVendorsPass && allGLPass;
  return {
    passed,
    per_vendor: perVendor,
    gl_budget_snapshot: glSnapshot,
    reason_codes: reasonCodesGlobal,
  };
}
