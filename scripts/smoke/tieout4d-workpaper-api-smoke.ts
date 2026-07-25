/**
 * Block D Path Y smoke — registry.build + signed downloads (same as workpaper route).
 * Usage: npx tsx --env-file=.env.local scripts/smoke/tieout4d-workpaper-api-smoke.ts
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEmitter } from "@/lib/audit-ready/tie-out/emitters/registry";
import { getSignedArtifactUrl } from "@/lib/audit-ready/tie-out/upload-artifact";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

const RUNS: Array<{ id: string; kind: TieOutKind }> = [
  { id: "769f79d9-6ab0-41be-8995-132e94e13c99", kind: "ap_aging" },
  { id: "aa69846e-2fd7-4b62-b91d-64e733e294d8", kind: "ar_aging" },
  { id: "ce2bd405-771a-473d-b8db-5e1e5b89aabc", kind: "inventory" },
  { id: "cf23082a-e7f4-43ec-b4e6-601e000a226e", kind: "grni" },
  { id: "8180e6b8-b0af-4409-8091-42f036a9b22d", kind: "bs_account_recon" },
];

async function main() {
  const supabase = getSupabaseAdmin();
  for (const r of RUNS) {
    const emitter = getEmitter(r.kind);
    if (!emitter) throw new Error(`no_emitter ${r.kind}`);
    const payload = await emitter.build(r.id);
    const mode = payload.face.mode ?? "two_sided";
    console.log(
      JSON.stringify({
        kind: r.kind,
        runId: r.id.slice(0, 8),
        mode,
        left: payload.face.leftAmountCents,
        right: payload.face.rightAmountCents,
        variance: payload.face.varianceCents,
        tieStatus: payload.face.tieStatus,
        tabs: payload.backupTabs.map((t) => t.tabName),
      }),
    );
    if (r.kind === "grni") {
      if (mode !== "report_only") throw new Error("grni_not_report_only");
      if (payload.face.rightAmountCents != null) throw new Error("grni_right_set");
      if (payload.face.varianceCents != null) throw new Error("grni_variance_set");
      if (payload.face.tieStatus !== "ties") throw new Error("grni_not_ties");
    }
    const { data: arts } = await supabase
      .from("audit_ready_run_artifacts")
      .select("artifact_kind, storage_path")
      .eq("tie_out_run_id", r.id);
    for (const a of arts ?? []) {
      const url = await getSignedArtifactUrl({
        storagePath: a.storage_path as string,
        expiresInSeconds: 600,
      });
      const head = await fetch(url, { method: "HEAD" });
      console.log(
        "  download",
        a.artifact_kind,
        head.status,
        (a.storage_path as string).split("/").pop(),
      );
    }
  }
  // 501 shape for unshipped
  const bank = getEmitter("bank_recon");
  console.log("bank_recon emitter:", bank === null ? "null (501 path)" : "UNEXPECTED");
  console.log("DONE");
}

main().catch((e) => {
  console.error("SMOKE_FAILED", e instanceof Error ? e.message : e);
  process.exit(1);
});
