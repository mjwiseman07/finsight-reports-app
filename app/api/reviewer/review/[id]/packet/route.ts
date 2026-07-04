import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { loadReviewItemForFirm } from "@/lib/reviewer/review-detail";
import { sha256OfReviewItemPacket } from "@/lib/reviewer/review-item-packet";
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";

const BUCKET = "review-item-packets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const persist = req.nextUrl.searchParams.get("persist") === "true";

    const detail = await loadReviewItemForFirm(id, ctx);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const supabase = createServiceClient();
    const { data: userData } = await supabase.auth.admin.getUserById(ctx.userId);
    const exportedByEmail = userData?.user?.email ?? ctx.userId;
    const exportedAt = new Date();

    const { buffer, sha256 } = await sha256OfReviewItemPacket({
      detail,
      exportedByEmail,
      exportedAt,
    });

    let storagePath: string | null = null;
    if (persist) {
      storagePath = `${detail.firmClientId}/${id}/packet-${sha256}.pdf`;
      await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      await supabase.from("review_item_packet_exports").insert({
        review_item_id: id,
        firm_client_id: detail.firmClientId,
        engagement_id: detail.engagementId,
        exported_by_user_id: ctx.userId,
        storage_path: storagePath,
        sha256,
        byte_size: buffer.length,
      });
    }

    await publishEvent({
      eventType: "review_item.packet_exported",
      eventCategory: "reviewer_ui",
      firmClientId: detail.firmClientId,
      engagementId: detail.engagementId,
      aggregateType: "pre_close_review_item",
      aggregateId: id,
      actorType: "user",
      actorId: ctx.userId,
      payload: { sha256, byteSize: buffer.length, storagePath, persist },
    });

    await supabase.from("ai_action_log").insert({
      action_type: "review_item_packet_export",
      action_category: "reviewer_ui_export",
      model_provider: "local",
      model_name: `user:${ctx.userId}`,
      input_summary: `review_item=${id} persist=${persist}`,
      output_summary: `sha256=${sha256} bytes=${buffer.length}`,
      firm_client_id: detail.firmClientId,
      engagement_id: detail.engagementId,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="review-item-${id}.pdf"`,
        "X-Packet-Sha256": sha256,
      },
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
