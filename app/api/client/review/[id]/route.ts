import { NextRequest, NextResponse } from "next/server";
import { requireClientAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { mapReviewItemDetail } from "@/lib/reviewer/queue-helpers";
import type { ClientReviewItemDetail } from "@/lib/pre-close/reviewer-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ClientReviewItemDetail | { error: string }>> {
  try {
    const ctx = await requireClientAuth(req);
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: item } = await supabase
      .from("pre_close_review_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { data: visibility } = await supabase
      .from("engagement_review_visibility")
      .select("*")
      .eq("engagement_id", item.engagement_id)
      .maybeSingle();
    if (!visibility?.client_can_view_queue) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: client } = await supabase
      .from("firm_clients")
      .select("name, firm_id")
      .eq("id", item.firm_client_id)
      .maybeSingle();
    if (!client || !ctx.firmClientIds.includes(item.firm_client_id as string)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: engagement } = await supabase
      .from("engagements")
      .select("engagement_name")
      .eq("id", item.engagement_id)
      .maybeSingle();

    const detail = mapReviewItemDetail(item, {
      firmClientName: (client.name as string) ?? "",
      engagementName: (engagement?.engagement_name as string) ?? "",
      qboJeId: null,
      postingLedgerEvents: [],
      remediationLog: [],
    });

    const redacted: ClientReviewItemDetail = { ...detail };
    redacted._redacted = {};

    if (!visibility.client_can_view_je_draft) {
      redacted.jeDraft = null;
      redacted.editedJeDraft = null;
      redacted._redacted!.jeDraft = true;
      redacted._redacted!.editedJeDraft = true;
    }
    if (!visibility.client_can_view_evidence) {
      redacted.evidenceRefs = null;
      redacted._redacted!.evidenceRefs = true;
    }

    return NextResponse.json(redacted);
  } catch (e) {
    return authErrorResponse(e) as NextResponse<ClientReviewItemDetail | { error: string }>;
  }
}
