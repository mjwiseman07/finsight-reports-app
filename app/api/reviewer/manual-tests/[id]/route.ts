import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { rowToManualTestEvidence } from "@/lib/assertions/manual-test-service";
import { EVIDENCE_TYPE_STRENGTH } from "@/lib/pre-close/manual-test-evidence-types";
import type { ManualEvidenceType } from "@/lib/pre-close/manual-test-evidence-types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const db = createServiceClient();

    const { data: row, error } = await db
      .from("manual_test_evidence")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: eng } = await db
      .from("engagements")
      .select("firm_id")
      .eq("id", row.engagement_id as string)
      .maybeSingle();
    if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: attachments } = await db
      .from("manual_test_attachments")
      .select("*")
      .eq("evidence_id", id);

    const signedAttachments = [];
    for (const att of attachments ?? []) {
      const { data: signed } = await db.storage
        .from("manual-test-evidence")
        .createSignedUrl(att.storage_path as string, 900);
      signedAttachments.push({
        ...att,
        signedUrl: signed?.signedUrl ?? null,
      });
    }

    const { data: events } = await db
      .from("ledger_events")
      .select("event_id, event_type, event_category, created_at, payload")
      .eq("event_category", "assertion")
      .contains("payload", { manual_test_id: id })
      .order("created_at", { ascending: false })
      .limit(20);

    const evidence = rowToManualTestEvidence(row);
    return NextResponse.json({
      evidence,
      strengthContribution:
        EVIDENCE_TYPE_STRENGTH[evidence.evidenceType as ManualEvidenceType] ?? "weak",
      attachments: signedAttachments,
      ledgerEvents: events ?? [],
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
