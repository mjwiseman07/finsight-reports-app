/**
 * D6.5 Part 2 · Block 6b — GL account budget checks.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";

export type BudgetCheckResult =
  | "within_budget"
  | "within_tolerance"
  | "exceeds_budget"
  | "no_budget_set";

export interface EvaluateForRequisitionInput {
  requisitionId: string;
  evaluatedByUserId: string;
}

export interface EvaluateForRequisitionOutput {
  result: BudgetCheckResult;
  glAccountCode: string | null;
  budgetAmountCents: number;
  committedCents: number;
  incomingCents: number;
  tolerancePct: number;
}

interface ReqWithLines {
  id: string;
  firm_id: string;
  firm_client_id: string;
  engagement_id: string | null;
  company_id: string;
  total_cents: number;
  gl_account_code: string | null;
}

async function loadReqPrimaryGl(reqId: string): Promise<ReqWithLines> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id, company_id, total_cents")
    .eq("id", reqId)
    .single();
  if (error || !data) throw new Error(`requisition not found: ${reqId}`);
  const { data: lines } = await supabase
    .from("requisition_line_items")
    .select("gl_account_code, line_total_cents")
    .eq("requisition_id", reqId)
    .order("line_total_cents", { ascending: false })
    .limit(1);
  const gl = lines && lines.length > 0 ? lines[0].gl_account_code : null;
  return { ...(data as ReqWithLines), gl_account_code: gl };
}

export async function evaluateBudgetForRequisition(
  input: EvaluateForRequisitionInput,
): Promise<EvaluateForRequisitionOutput> {
  const req = await loadReqPrimaryGl(input.requisitionId);
  const now = new Date();
  const periodYear = now.getUTCFullYear();
  const periodMonth = now.getUTCMonth() + 1;
  await assertEntitlement("ap_budget_controls", req.engagement_id, {
    caller: "budget.evaluateForRequisition",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.evaluatedByUserId,
  });
  await assertPilotFeature("ap_budget_controls", req.firm_id);
  const supabase = createServiceClient();
  if (!req.gl_account_code) {
    await recordBudgetResult(supabase, {
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      companyId: req.company_id,
      aggregateType: "requisition",
      aggregateId: req.id,
      glAccountCode: "",
      periodYear,
      periodMonth,
      budgetAmountCents: 0,
      committedCents: 0,
      incomingCents: req.total_cents,
      tolerancePct: 0,
      result: "no_budget_set",
      evaluatedByUserId: input.evaluatedByUserId,
    });
    return {
      result: "no_budget_set",
      glAccountCode: null,
      budgetAmountCents: 0,
      committedCents: 0,
      incomingCents: req.total_cents,
      tolerancePct: 0,
    };
  }
  const { data: budget } = await supabase
    .from("gl_account_budgets")
    .select("budget_amount_cents, tolerance_pct")
    .eq("company_id", req.company_id)
    .eq("gl_account_code", req.gl_account_code)
    .eq("period_year", periodYear)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (!budget) {
    await recordBudgetResult(supabase, {
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      companyId: req.company_id,
      aggregateType: "requisition",
      aggregateId: req.id,
      glAccountCode: req.gl_account_code,
      periodYear,
      periodMonth,
      budgetAmountCents: 0,
      committedCents: 0,
      incomingCents: req.total_cents,
      tolerancePct: 0,
      result: "no_budget_set",
      evaluatedByUserId: input.evaluatedByUserId,
    });
    return {
      result: "no_budget_set",
      glAccountCode: req.gl_account_code,
      budgetAmountCents: 0,
      committedCents: 0,
      incomingCents: req.total_cents,
      tolerancePct: 0,
    };
  }
  const { data: committedRows } = await supabase
    .from("requisitions")
    .select("id, total_cents")
    .eq("company_id", req.company_id)
    .in("status", ["approved", "converted_to_po"])
    .neq("id", req.id);
  let committedCents = 0;
  if (committedRows && committedRows.length > 0) {
    const ids = committedRows.map((r) => r.id);
    const { data: lineSums } = await supabase
      .from("requisition_line_items")
      .select("requisition_id, gl_account_code, line_total_cents")
      .in("requisition_id", ids)
      .eq("gl_account_code", req.gl_account_code);
    committedCents = (lineSums ?? []).reduce(
      (acc, r) => acc + Number(r.line_total_cents ?? 0),
      0,
    );
  }
  const total = committedCents + req.total_cents;
  const budgetCents = Number(budget.budget_amount_cents);
  const tolerancePct = Number(budget.tolerance_pct);
  const toleranceCents = Math.floor((budgetCents * tolerancePct) / 100);
  let result: BudgetCheckResult;
  if (total <= budgetCents) result = "within_budget";
  else if (total <= budgetCents + toleranceCents) result = "within_tolerance";
  else result = "exceeds_budget";
  await recordBudgetResult(supabase, {
    firmId: req.firm_id,
    firmClientId: req.firm_client_id,
    companyId: req.company_id,
    aggregateType: "requisition",
    aggregateId: req.id,
    glAccountCode: req.gl_account_code,
    periodYear,
    periodMonth,
    budgetAmountCents: budgetCents,
    committedCents,
    incomingCents: req.total_cents,
    tolerancePct,
    result,
    evaluatedByUserId: input.evaluatedByUserId,
  });
  await publishEvent(
    {
      eventType: "budget.evaluated",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.evaluatedByUserId,
      payload: {
        gl_account_code: req.gl_account_code,
        period_year: periodYear,
        period_month: periodMonth,
        budget_amount_cents: budgetCents,
        committed_cents: committedCents,
        incoming_cents: req.total_cents,
        result,
      },
    },
    supabase,
  );
  if (result === "within_tolerance") {
    await publishEvent(
      {
        eventType: "budget.tolerance_hit",
        eventCategory: "ap",
        firmId: req.firm_id,
        firmClientId: req.firm_client_id,
        engagementId: req.engagement_id ?? undefined,
        aggregateType: "requisition",
        aggregateId: req.id,
        actorType: "user",
        actorId: input.evaluatedByUserId,
        payload: {
          gl_account_code: req.gl_account_code,
          over_budget_cents: total - budgetCents,
          tolerance_cents: toleranceCents,
        },
      },
      supabase,
    );
  }
  if (result === "exceeds_budget") {
    await publishEvent(
      {
        eventType: "budget.exceeded",
        eventCategory: "ap",
        firmId: req.firm_id,
        firmClientId: req.firm_client_id,
        engagementId: req.engagement_id ?? undefined,
        aggregateType: "requisition",
        aggregateId: req.id,
        actorType: "user",
        actorId: input.evaluatedByUserId,
        payload: {
          gl_account_code: req.gl_account_code,
          overage_cents: total - budgetCents,
        },
      },
      supabase,
    );
  }
  return {
    result,
    glAccountCode: req.gl_account_code,
    budgetAmountCents: budgetCents,
    committedCents,
    incomingCents: req.total_cents,
    tolerancePct,
  };
}

async function recordBudgetResult(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    firmId: string;
    firmClientId: string;
    companyId: string;
    aggregateType: "requisition" | "bill" | "purchase_order";
    aggregateId: string;
    glAccountCode: string;
    periodYear: number;
    periodMonth: number;
    budgetAmountCents: number;
    committedCents: number;
    incomingCents: number;
    tolerancePct: number;
    result: BudgetCheckResult;
    evaluatedByUserId: string;
  },
): Promise<void> {
  await supabase.from("budget_check_results").insert({
    firm_id: row.firmId,
    firm_client_id: row.firmClientId,
    company_id: row.companyId,
    aggregate_type: row.aggregateType,
    aggregate_id: row.aggregateId,
    gl_account_code: row.glAccountCode,
    period_year: row.periodYear,
    period_month: row.periodMonth,
    budget_amount_cents: row.budgetAmountCents,
    committed_cents: row.committedCents,
    incoming_cents: row.incomingCents,
    tolerance_pct: row.tolerancePct,
    result: row.result,
    evaluated_by_user_id: row.evaluatedByUserId,
  });
}

export interface UpsertBudgetInput {
  firmId: string;
  firmClientId: string;
  companyId: string;
  glAccountCode: string;
  glAccountName?: string;
  periodYear: number;
  periodMonth: number;
  budgetAmountCents: number;
  currency?: string;
  tolerancePct?: number;
  createdByUserId: string;
  engagementId?: string | null;
}

export async function upsertGlBudget(input: UpsertBudgetInput): Promise<string> {
  await assertEntitlement("ap_budget_controls", input.engagementId ?? null, {
    caller: "budget.upsertGlBudget",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.createdByUserId,
  });
  await assertPilotFeature("ap_budget_controls", input.firmId);
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("gl_account_budgets")
    .upsert(
      {
        firm_id: input.firmId,
        firm_client_id: input.firmClientId,
        company_id: input.companyId,
        gl_account_code: input.glAccountCode,
        gl_account_name: input.glAccountName ?? null,
        period_year: input.periodYear,
        period_month: input.periodMonth,
        budget_amount_cents: input.budgetAmountCents,
        currency: input.currency ?? "USD",
        tolerance_pct: input.tolerancePct ?? 0,
        source: "manual",
        created_by: input.createdByUserId,
        updated_at: nowIso,
      },
      { onConflict: "company_id,gl_account_code,period_year,period_month" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`gl budget upsert failed: ${error?.message}`);
  return data.id;
}
