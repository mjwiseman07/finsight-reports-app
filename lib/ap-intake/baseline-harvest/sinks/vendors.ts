import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarvestedVendorRow, HarvestSource } from "../types";
export async function sinkVendors(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  source: HarvestSource;
  runId: string;
  rows: HarvestedVendorRow[];
}): Promise<number> {
  if (args.rows.length === 0) return 0;
  const nowIso = new Date().toISOString();
  const insertRows = args.rows.map((v) => ({
    firm_id: args.firmId,
    firm_client_id: args.firmClientId,
    erp_platform: args.source === "qbo" ? "qbo" : "csv",
    external_vendor_id: v.externalVendorId,
    display_name: v.displayName,
    normalized_name: v.normalizedName,
    metaphone_code: v.metaphoneCode,
    active: v.active,
    primary_email: v.primaryEmail ?? null,
    primary_phone: v.primaryPhone ?? null,
    last_synced_at: nowIso,
    last_snapshot_hash: v.snapshotHash,
    baseline_source: args.source,
    baseline_harvest_run_id: args.runId,
  }));
  const { error } = await args.supabase
    .from("vendor_master_mirror")
    .upsert(insertRows, { onConflict: "firm_client_id,erp_platform,external_vendor_id" });
  if (error) throw new Error(`sinkVendors failed: ${error.message}`);
  return insertRows.length;
}
