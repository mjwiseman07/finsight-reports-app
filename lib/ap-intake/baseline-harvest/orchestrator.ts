/**
 * D6.5 Part 2 — Block 6a: L0.5 baseline harvest orchestrator.
 * Two-layer gate: assertEntitlement("ap_baseline_harvest", ...) + assertPilotFeature("ap_baseline_harvest", ...).
 * Order: vendors → PO → bills → goods_receipts → chart_of_accounts.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { resolveEngagementId } from "@/lib/engagements/resolve";
import { publishEvent } from "@/lib/events/publisher";
import type { BaselineHarvestStartInput, HarvestSourceAdapter, HarvestSource } from "./types";
import { QboHarvestAdapter } from "./sources/qbo";
import { CsvHarvestAdapter } from "./sources/csv";
import { sinkVendors } from "./sinks/vendors";
import { sinkPurchaseOrders } from "./sinks/purchase-orders";
import { sinkBills } from "./sinks/bills";
import { sinkGoodsReceipts } from "./sinks/goods-receipts";
function adapterFor(source: HarvestSource, actorUserId: string): HarvestSourceAdapter {
  if (source === "qbo") return new QboHarvestAdapter(actorUserId);
  return new CsvHarvestAdapter(actorUserId);
}
export async function startBaselineHarvest(
  input: BaselineHarvestStartInput,
): Promise<{ runId: string }> {
  const supabase = createServiceClient();
  const engagementId = await resolveEngagementId(supabase, input.firmClientId);
  await assertEntitlement("ap_baseline_harvest", engagementId, {
    caller: "baseline_harvest.start",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_baseline_harvest", input.firmId);
  const { data: run, error } = await supabase
    .from("baseline_harvest_runs")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      source: input.source,
      status: "running",
      actor_id: input.actorUserId,
      counts: {},
    })
    .select("id")
    .single();
  if (error || !run) throw new Error(`harvest run insert failed: ${error?.message ?? "no row"}`);
  await publishEvent(
    {
      eventType: "baseline_harvest.started",
      eventCategory: "ap",
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      engagementId: engagementId ?? undefined,
      aggregateType: "baseline_harvest_run",
      aggregateId: run.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: { source: input.source },
    },
    supabase,
  );
  // Fire-and-forget: execute harvest in background. In serverless this returns
  // the runId immediately; the caller polls counts via GET /api/onboarding/baseline-harvest/:runId.
  void executeHarvest(run.id, input).catch(async (err) => {
    await supabase
      .from("baseline_harvest_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", run.id);
    await publishEvent(
      {
        eventType: "baseline_harvest.failed",
        eventCategory: "ap",
        firmId: input.firmId,
        firmClientId: input.firmClientId,
        aggregateType: "baseline_harvest_run",
        aggregateId: run.id,
        actorType: "system",
        payload: { error: err instanceof Error ? err.message : String(err) },
      },
      supabase,
    );
  });
  return { runId: run.id };
}
async function executeHarvest(runId: string, input: BaselineHarvestStartInput): Promise<void> {
  const supabase = createServiceClient();
  const adapter = adapterFor(input.source, input.actorUserId);
  const counts: Record<string, number> = {};
  const vendors = await adapter.fetchVendors({ firmClientId: input.firmClientId });
  counts.vendors = await sinkVendors({
    supabase,
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    source: input.source,
    runId,
    rows: vendors,
  });
  const pos = await adapter.fetchPurchaseOrders({ firmClientId: input.firmClientId });
  counts.purchase_orders = await sinkPurchaseOrders({
    supabase,
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    source: input.source,
    runId,
    rows: pos,
  });
  const bills = await adapter.fetchBills({ firmClientId: input.firmClientId });
  counts.bills = await sinkBills({
    supabase,
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    source: input.source,
    runId,
    rows: bills,
  });
  const grs = await adapter.fetchGoodsReceipts({ firmClientId: input.firmClientId });
  counts.goods_receipts = await sinkGoodsReceipts({
    supabase,
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    source: input.source,
    runId,
    rows: grs,
  });
  if (adapter.fetchChartOfAccounts) {
    const coa = await adapter.fetchChartOfAccounts({ firmClientId: input.firmClientId });
    counts.chart_of_accounts = coa.length;
    if (coa.length > 0) {
      const rows = coa.map((c) => ({
        firm_id: input.firmId,
        firm_client_id: input.firmClientId,
        external_account_id: c.externalAccountId,
        account_number: c.accountNumber ?? null,
        account_name: c.accountName,
        account_type: c.accountType ?? null,
        account_subtype: c.accountSubtype ?? null,
        active: c.active,
        baseline_harvest_run_id: runId,
        last_synced_at: new Date().toISOString(),
      }));
      await supabase.from("qbo_coa_mirror").upsert(rows, {
        onConflict: "firm_client_id,external_account_id",
      });
    }
  }
  await supabase
    .from("baseline_harvest_runs")
    .update({ status: "completed", completed_at: new Date().toISOString(), counts })
    .eq("id", runId);
  await publishEvent(
    {
      eventType: "baseline_harvest.completed",
      eventCategory: "ap",
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      aggregateType: "baseline_harvest_run",
      aggregateId: runId,
      actorType: "system",
      payload: { counts },
    },
    supabase,
  );
}
