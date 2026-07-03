/**
 * D3 Forward Learner — reinforceFromPostedJEs(firmClientId, opts?).
 *
 * Reads posted_je memories written by the D2 poster since the last scan (or an
 * explicit sinceDate), feeds any line-level payload into the same three
 * accumulators, and flushes with source='forward' so existing patterns are
 * reinforced in place. Emits a scan_run memory with source='forward'.
 *
 * Note: the D2 posted_je payload currently stores totals, not per-line detail.
 * When payload.lines is absent this learner runs clean and no-ops on that
 * record; it becomes productive once line-level posted_je payloads exist.
 */
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { upsertMemory } from "@/lib/memory/client-memory-service";
import { VendorGLAccumulator } from "./accumulators/vendor-gl-accumulator";
import { RecurringAccumulator } from "./accumulators/recurring-accumulator";
import { AmountRangeAccumulator } from "./accumulators/amount-range-accumulator";
import type { Accumulator, LearnedLine } from "./types";

export interface ReinforceOptions {
  sinceDate?: string; // ISO timestamp
}

export interface ReinforceResult {
  run_id: string;
  posted_je_count: number;
  patterns_reinforced: { vendor_gl: number; recurring: number; amount_range: number };
  since: string;
}

async function resolveCompanyId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  firmClientId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!data?.company_id) throw new Error(`firm_client ${firmClientId} has no company_id`);
  return data.company_id as string;
}

async function lastScanCompletedAt(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  companyId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("company_memory_records")
    .select("payload, updated_at")
    .eq("company_id", companyId)
    .eq("memory_type", "scan_run")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const completed = (data?.payload as { completed_at?: string } | undefined)?.completed_at;
  return completed ?? null;
}

function payloadToLines(payload: Record<string, unknown>): LearnedLine[] {
  const rawLines = payload?.lines;
  if (!Array.isArray(rawLines)) return [];
  const txnDate = String(payload.transaction_date ?? "");
  const txnId = String(payload.qbo_je_id ?? "");
  const out: LearnedLine[] = [];
  for (const raw of rawLines as Array<Record<string, unknown>>) {
    const accountId = raw.account_id as string | undefined;
    if (!accountId) continue;
    out.push({
      txn_type: "JournalEntry",
      txn_id: txnId,
      txn_date: txnDate,
      vendor_id: (raw.vendor_id as string) ?? undefined,
      vendor_name: (raw.vendor_name as string) ?? undefined,
      customer_id: (raw.customer_id as string) ?? undefined,
      account_id: accountId,
      amount: Math.abs(Number(raw.amount) || 0),
      posting_type: raw.posting_type === "Credit" ? "Credit" : "Debit",
    });
  }
  return out;
}

export async function reinforceFromPostedJEs(
  firmClientId: string,
  opts: ReinforceOptions = {},
): Promise<ReinforceResult> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();
  const companyId = await resolveCompanyId(supabase, firmClientId);

  const since =
    opts.sinceDate ?? (await lastScanCompletedAt(supabase, companyId)) ?? "1970-01-01T00:00:00.000Z";

  const { data: postedJEs, error } = await supabase
    .from("company_memory_records")
    .select("payload, updated_at")
    .eq("company_id", companyId)
    .eq("memory_type", "posted_je")
    .eq("persistence_status", "persisted")
    .gte("updated_at", since)
    .order("updated_at", { ascending: true });
  if (error) throw new Error(`posted_je query failed: ${error.message}`);

  const vendorGl = new VendorGLAccumulator();
  const recurring = new RecurringAccumulator();
  const amountRange = new AmountRangeAccumulator();
  const accumulators: Accumulator[] = [vendorGl, recurring, amountRange];

  for (const row of postedJEs ?? []) {
    const lines = payloadToLines((row.payload as Record<string, unknown>) ?? {});
    for (const line of lines) {
      for (const acc of accumulators) acc.add(line);
    }
  }

  const vendorFlush = await vendorGl.flush(firmClientId, "forward");
  const recurringFlush = await recurring.flush(firmClientId, "forward");
  const amountFlush = await amountRange.flush(firmClientId, "forward");

  const runId = randomUUID();
  const patternsReinforced = {
    vendor_gl: vendorFlush.patterns_written,
    recurring: recurringFlush.patterns_written,
    amount_range: amountFlush.patterns_written,
  };

  await upsertMemory({
    firmClientId,
    memoryType: "scan_run",
    memoryId: `mem_${firmClientId}_scan_run_${runId}`,
    payload: {
      run_id: runId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      txn_count: postedJEs?.length ?? 0,
      patterns_created: {},
      patterns_reinforced: patternsReinforced,
      source: "forward",
      errors: [],
    },
  });

  return {
    run_id: runId,
    posted_je_count: postedJEs?.length ?? 0,
    patterns_reinforced: patternsReinforced,
    since,
  };
}
