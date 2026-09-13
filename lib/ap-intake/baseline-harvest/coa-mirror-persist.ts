/**
 * D6.5 — Persist harvested COA rows into qbo_coa_mirror.
 * Shared by baseline harvest orchestrator and governed JE COA bootstrap.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { HarvestedCoaRow } from "./types";

export async function persistCoaMirrorRows(args: {
  firmId: string;
  firmClientId: string;
  runId: string;
  rows: readonly HarvestedCoaRow[];
}): Promise<number> {
  if (args.rows.length === 0) return 0;
  const supabase = createServiceClient();
  const rows = args.rows.map((c) => ({
    firm_id: args.firmId,
    firm_client_id: args.firmClientId,
    external_account_id: c.externalAccountId,
    account_number: c.accountNumber ?? null,
    account_name: c.accountName,
    account_type: c.accountType ?? null,
    account_subtype: c.accountSubtype ?? null,
    active: c.active,
    baseline_harvest_run_id: args.runId,
    last_synced_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("qbo_coa_mirror").upsert(rows, {
    onConflict: "firm_client_id,external_account_id",
  });
  if (error) {
    throw new Error(`qbo_coa_mirror upsert failed: ${error.message}`);
  }
  return rows.length;
}
