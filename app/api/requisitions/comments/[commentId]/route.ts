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
    if (!auth.firmIds[0]) {
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
    await editComment({ commentId, authorUserId: auth.userId, body: String(body.body) });
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
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { commentId } = await ctx.params;
    await deleteComment({ commentId, authorUserId: auth.userId });
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
