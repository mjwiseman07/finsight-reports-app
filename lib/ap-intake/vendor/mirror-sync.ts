import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import { logAiAction } from "@/lib/ai/action-logger";
import { normalizeVendorName } from "./normalize";
import { metaphone } from "./fuzzy";
import type { ErpVendorSyncPayload } from "./mirror-schema";

interface Adapter {
  syncVendorMirror: (args: { firmClientId: string }) => Promise<ErpVendorSyncPayload>;
  platform: string;
}

export async function refreshVendorMirror(args: {
  firmClientId: string;
  firmId: string;
  adapter: Adapter;
  supabase: SupabaseClient;
}): Promise<{ synced: number; snapshot_hash: string }> {
  const { firmClientId, firmId, adapter, supabase } = args;

  let payload: ErpVendorSyncPayload;
  try {
    payload = await adapter.syncVendorMirror({ firmClientId });
  } catch (err) {
    await logAiAction({
      firmClientId,
      actionType: "mirror_refresh_failed",
      actionCategory: "vendor_resolution",
      modelName: "vendor_mirror_sync",
      modelProvider: "local",
      input: { firm_client_id: firmClientId, error: (err as Error).message },
      output: {},
    });
    throw err;
  }

  const rows = payload.vendors.map((v) => {
    const normalized = normalizeVendorName(v.display_name);
    const snapshot = JSON.stringify({
      external_id: v.external_id,
      display_name: v.display_name,
      active: v.active,
      sync_token: v.sync_token,
    });
    return {
      firm_id: firmId,
      firm_client_id: firmClientId,
      erp_platform: adapter.platform,
      external_vendor_id: v.external_id,
      display_name: v.display_name,
      normalized_name: normalized,
      metaphone_code: metaphone(normalized),
      active: v.active,
      sync_token: v.sync_token,
      primary_email: v.primary_email,
      primary_phone: v.primary_phone,
      last_synced_at: payload.synced_at,
      last_snapshot_hash: createHash("sha256").update(snapshot).digest("hex"),
    };
  });

  const { error } = await supabase
    .from("vendor_master_mirror")
    .upsert(rows, { onConflict: "firm_client_id,erp_platform,external_vendor_id" });
  if (error) throw new Error(error.message);

  const seenIds = payload.vendors.map((v) => v.external_id);
  if (seenIds.length > 0) {
    const quoted = seenIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
    await supabase
      .from("vendor_master_mirror")
      .update({ active: false, last_synced_at: payload.synced_at })
      .eq("firm_client_id", firmClientId)
      .eq("erp_platform", adapter.platform)
      .filter("external_vendor_id", "not.in", `(${quoted})`);
  }

  const rootHash = createHash("sha256")
    .update(
      rows
        .map((r) => r.last_snapshot_hash)
        .sort()
        .join(""),
    )
    .digest("hex");

  await publishEvent(
    {
      eventType: "vendor.mirror_refreshed",
      eventCategory: "ap",
      firmId,
      firmClientId,
      aggregateType: "vendor_master_mirror",
      aggregateId: firmClientId,
      actorType: "system",
      payload: { synced_count: rows.length, snapshot_hash_root: rootHash },
    },
    supabase,
  );

  return { synced: rows.length, snapshot_hash: rootHash };
}
