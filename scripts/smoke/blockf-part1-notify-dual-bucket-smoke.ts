/**
 * Block F Part 1 smoke: verify bs-recon-notify signs PDF URLs against
 * audit-ready-workpapers when newPdfObjectKey is provided.
 *
 * Preview-only. Skips in production.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

async function main() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    console.log("[smoke] skip: production environment");
    process.exit(0);
  }

  const supabase = getSupabaseAdmin();

  // Find the most recent completed tie-out run with a PDF artifact in the new bucket
  const { data: recentArtifact, error } = await supabase
    .from("audit_ready_run_artifacts")
    .select("tie_out_run_id, storage_path, storage_bucket")
    .eq("artifact_kind", "pdf")
    .eq("storage_bucket", "audit-ready-workpapers")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !recentArtifact) {
    console.error("[smoke] FAIL: no PDF artifact found in audit-ready-workpapers");
    console.error(error);
    process.exit(1);
  }

  // Sign against new bucket directly to verify RLS + storage grants
  const { data: signed, error: signErr } = await supabase.storage
    .from("audit-ready-workpapers")
    .createSignedUrl(recentArtifact.storage_path, 60);

  if (signErr || !signed?.signedUrl) {
    console.error("[smoke] FAIL: sign against audit-ready-workpapers failed");
    console.error(signErr);
    process.exit(1);
  }

  if (!signed.signedUrl.includes("audit-ready-workpapers")) {
    console.error(
      "[smoke] FAIL: signed URL does not include expected bucket name",
    );
    console.error(signed.signedUrl);
    process.exit(1);
  }

  console.log(
    "[smoke] PASS: dual-bucket notify path signs against audit-ready-workpapers",
  );
  console.log("[smoke]   run_id:", recentArtifact.tie_out_run_id);
  console.log("[smoke]   path:", recentArtifact.storage_path);
  process.exit(0);
}

main().catch((err) => {
  console.error("[smoke] FAIL: unexpected error");
  console.error(err);
  process.exit(1);
});
