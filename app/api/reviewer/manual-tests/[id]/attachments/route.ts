import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { attachFileToManualTest } from "@/lib/assertions/manual-test-service";

export const runtime = "nodejs";

function extFromFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "bin";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const db = createServiceClient();

    const { data: evidence } = await db
      .from("manual_test_evidence")
      .select("id, firm_client_id, engagement_id")
      .eq("id", id)
      .maybeSingle();
    if (!evidence) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: eng } = await db
      .from("engagements")
      .select("firm_id")
      .eq("id", evidence.engagement_id as string)
      .maybeSingle();
    if (!eng || !ctx.writerFirmIds.includes(eng.firm_id as string)) {
      throw new ReviewerAuthError("writer_required", 403);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const ext = extFromFilename(file.name);
    const storagePath = `${evidence.firm_client_id}/${id}/${sha256}.${ext}`;

    const { data: existing } = await db
      .from("manual_test_attachments")
      .select("*")
      .eq("evidence_id", id)
      .eq("sha256", sha256)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ attachment: existing, deduplicated: true });
    }

    const { error: upErr } = await db.storage
      .from("manual-test-evidence")
      .upload(storagePath, bytes, { contentType: file.type, upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const attachment = await attachFileToManualTest(db, {
      evidenceId: id,
      firmClientId: evidence.firm_client_id as string,
      engagementId: evidence.engagement_id as string,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: bytes.length,
      sha256,
      storagePath,
      ingestedFrom: "reviewer_upload",
      ingestedBy: ctx.userId,
    });

    return NextResponse.json({ attachment, deduplicated: false });
  } catch (e) {
    return authErrorResponse(e);
  }
}
