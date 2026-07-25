/**
 * Block C runtime smoke — AP / AR / Inventory / GRNI dual-write via runTieOut.
 * Same code path as Preview worker. Downloads each artifact for eyeball.
 * Usage: npx tsx --env-file=.env.local scripts/smoke/tieout4c-workpaper-smoke.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { runTieOut } from "@/lib/audit-ready/tie-out/worker";
import { getSignedArtifactUrl } from "@/lib/audit-ready/tie-out/upload-artifact";

const ENG = "724546e9-6deb-4f7f-b8ad-88e5ee65353d";
const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const AS_OF = "2026-06-30";

const PBCS: Array<{ kind: string; pbcRequestId: string }> = [
  { kind: "ap_aging", pbcRequestId: "7cfd36db-968d-4a13-af86-ae7b9894e828" },
  { kind: "ar_aging", pbcRequestId: "46937504-61a8-4359-9a14-846ee7c072b9" },
  { kind: "inventory", pbcRequestId: "a48023ab-37ad-47b3-9150-c764624a195c" },
  { kind: "grni", pbcRequestId: "cfd8b519-ee04-4a59-98e7-f6dcdd898dad" },
];

async function main() {
  const supabase = getSupabaseAdmin();
  const runIds: string[] = [];

  for (const p of PBCS) {
    console.log(`=== ${p.kind} run ===`);
    const out = await runTieOut({
      engagementId: ENG,
      pbcRequestId: p.pbcRequestId,
      asOfDate: AS_OF,
      triggeredByUserId: USER,
      triggerReason: "manual",
    });
    console.log(JSON.stringify(out));
    if (!out.ok) throw new Error(`${p.kind}_failed: ${out.reason}`);
    runIds.push(out.runId);
  }

  const { data: arts, error: artErr } = await supabase
    .from("audit_ready_run_artifacts")
    .select(
      "id, tie_out_run_id, artifact_kind, storage_path, file_size_bytes, content_hash, generated_at",
    )
    .in("tie_out_run_id", runIds)
    .order("generated_at", { ascending: false });
  if (artErr) throw new Error(artErr.message);

  console.log("=== artifacts count ===", arts?.length ?? 0);
  console.log(JSON.stringify(arts, null, 2));

  const outDir = resolve(process.cwd(), ".tmp-4c-smoke-artifacts");
  mkdirSync(outDir, { recursive: true });
  const manifest: Array<{
    runId: string;
    kind: string;
    path: string;
    bytes: number;
    magic: string;
  }> = [];

  const kindByRun = new Map(PBCS.map((p, i) => [runIds[i], p.kind]));

  for (const a of arts ?? []) {
    const url = await getSignedArtifactUrl({
      storagePath: a.storage_path as string,
      expiresInSeconds: 3600,
    });
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`download_failed ${a.artifact_kind} ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = a.artifact_kind === "xlsx" ? "xlsx" : "pdf";
    const kind = kindByRun.get(a.tie_out_run_id as string) ?? "unknown";
    const fname = `${kind}-${a.artifact_kind}.${ext}`;
    const fpath = resolve(outDir, fname);
    writeFileSync(fpath, buf);
    const magic =
      a.artifact_kind === "pdf"
        ? buf.subarray(0, 4).toString("utf8")
        : buf.subarray(0, 2).toString("hex");
    manifest.push({
      runId: a.tie_out_run_id as string,
      kind: `${kind}-${a.artifact_kind}`,
      path: fpath,
      bytes: buf.length,
      magic,
    });
    console.log("wrote", fname, buf.length, magic);
  }

  writeFileSync(
    resolve(outDir, "manifest.json"),
    JSON.stringify({ runIds, arts, manifest }, null, 2),
  );
  console.log("DONE outDir=", outDir);
}

main().catch((e) => {
  console.error("SMOKE_FAILED", e instanceof Error ? e.message : e);
  process.exit(1);
});
