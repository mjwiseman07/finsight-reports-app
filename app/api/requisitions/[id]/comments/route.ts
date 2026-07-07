import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  addComment,
  listComments,
  CommentValidationError,
} from "@/lib/ap-intake/comments/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const rows = await listComments(id);
    return NextResponse.json({ ok: true, comments: rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (!body?.body) {
      return NextResponse.json(
        { error: "validation", field: "body", message: "body required" },
        { status: 422 },
      );
    }
    const commentId = await addComment({
      requisitionId: id,
      authorUserId: auth.userId,
      body: String(body.body),
      parentCommentId: body?.parent_comment_id,
    });
    return NextResponse.json({ ok: true, comment_id: commentId });
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
