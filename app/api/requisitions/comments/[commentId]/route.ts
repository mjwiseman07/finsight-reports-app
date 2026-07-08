import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  editComment,
  deleteComment,
  CommentValidationError,
} from "@/lib/ap-intake/comments/service";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ commentId: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { commentId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (!body?.body) {
      return NextResponse.json(
        { error: "validation", field: "body", message: "body required" },
        { status: 422 },
      );
    }
    const engagementId = typeof body?.engagement_id === "string" ? body.engagement_id : null;
    if (!engagementId) {
      return NextResponse.json(
        { error: "engagement_id is required for entitlement enforcement" },
        { status: 400 },
      );
    }
    await editComment({
      commentId,
      authorUserId: auth.userId,
      body: String(body.body),
      firmId,
      engagementId,
      firmClientId:
        typeof body.firm_client_id === "string" ? body.firm_client_id : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommentValidationError) {
      return NextResponse.json(
        { error: "validation", field: err.field, message: err.message },
        { status: 422 },
      );
    }
    return authErrorResponse(err);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ commentId: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { commentId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const engagementId = typeof body?.engagement_id === "string" ? body.engagement_id : null;
    if (!engagementId) {
      return NextResponse.json(
        { error: "engagement_id is required for entitlement enforcement" },
        { status: 400 },
      );
    }
    await deleteComment({
      commentId,
      authorUserId: auth.userId,
      firmId,
      engagementId,
      firmClientId:
        typeof body.firm_client_id === "string" ? body.firm_client_id : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CommentValidationError) {
      return NextResponse.json(
        { error: "validation", field: err.field, message: err.message },
        { status: 422 },
      );
    }
    return authErrorResponse(err);
  }
}
