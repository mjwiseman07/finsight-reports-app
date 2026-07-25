import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

async function main() {
  const s = getSupabaseAdmin();
  const { data: lineage, error: e1 } = await s
    .from("audit_ready_tie_out_runs")
    .select("id, tie_out_kind, trigger_kind, regenerated_from_run_id, started_at")
    .not("regenerated_from_run_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(5);
  if (e1) throw e1;
  console.log("LINEAGE", JSON.stringify(lineage, null, 2));

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: summary, error: e2 } = await s
    .from("audit_ready_tie_out_runs")
    .select("id, status, error_message, trigger_kind, started_at")
    .eq("tie_out_kind", "bs_recon_summary")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(5);
  if (e2) throw e2;
  console.log("SUMMARY_1H", JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
