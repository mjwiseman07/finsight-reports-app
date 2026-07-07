/**
 * D6.5 Part 2 · Block 6b — Requisition comment threads.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";

export class CommentValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "CommentValidationError";
    this.field = field;
  }
}

export interface AddCommentInput {
  requisitionId: string;
  authorUserId: string;
  body: string;
  parentCommentId?: string;
}

export interface EditCommentInput {
  commentId: string;
  authorUserId: string;
  body: string;
}

export interface DeleteCommentInput {
  commentId: string;
  authorUserId: string;
}

interface RequisitionCoreRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  engagement_id: string | null;
}

async function loadReqCore(reqId: string): Promise<RequisitionCoreRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id")
    .eq("id", reqId)
    .single();
  if (error || !data) throw new Error(`requisition not found: ${reqId}`);
  return data as RequisitionCoreRow;
}

export async function addComment(input: AddCommentInput): Promise<string> {
  const body = input.body.trim();
  if (!body) throw new CommentValidationError("body", "body required");
  if (body.length > 10000) throw new CommentValidationError("body", "body too long");
  const req = await loadReqCore(input.requisitionId);
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "comments.add",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.authorUserId,
  });
  const supabase = createServiceClient();
  if (input.parentCommentId) {
    const { data: parent } = await supabase
      .from("requisition_comments")
      .select("id, requisition_id")
      .eq("id", input.parentCommentId)
      .maybeSingle();
    if (!parent || parent.requisition_id !== req.id) {
      throw new CommentValidationError("parentCommentId", "parent comment mismatch");
    }
  }
  const { data, error } = await supabase
    .from("requisition_comments")
    .insert({
      requisition_id: req.id,
      firm_id: req.firm_id,
      firm_client_id: req.firm_client_id,
      parent_comment_id: input.parentCommentId ?? null,
      author_user_id: input.authorUserId,
      body,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`comment insert failed: ${error?.message}`);
  await publishEvent(
    {
      eventType: "requisition.commented",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.authorUserId,
      payload: {
        comment_id: data.id,
        parent_comment_id: input.parentCommentId ?? null,
      },
    },
    supabase,
  );
  return data.id;
}

export async function editComment(input: EditCommentInput): Promise<void> {
  const body = input.body.trim();
  if (!body) throw new CommentValidationError("body", "body required");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_comments")
    .select("id, requisition_id, firm_id, firm_client_id, author_user_id, deleted_at")
    .eq("id", input.commentId)
    .single();
  if (error || !data) throw new Error(`comment not found: ${input.commentId}`);
  if (data.deleted_at) throw new CommentValidationError("comment", "comment deleted");
  if (data.author_user_id !== input.authorUserId) {
    throw new CommentValidationError("authorUserId", "only author can edit");
  }
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_comments")
    .update({ body, edited_at: nowIso })
    .eq("id", data.id);
  await publishEvent(
    {
      eventType: "requisition.comment_edited",
      eventCategory: "ap",
      firmId: data.firm_id,
      firmClientId: data.firm_client_id,
      aggregateType: "requisition",
      aggregateId: data.requisition_id,
      actorType: "user",
      actorId: input.authorUserId,
      payload: { comment_id: data.id },
    },
    supabase,
  );
}

export async function deleteComment(input: DeleteCommentInput): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_comments")
    .select("id, requisition_id, firm_id, firm_client_id, author_user_id, deleted_at")
    .eq("id", input.commentId)
    .single();
  if (error || !data) throw new Error(`comment not found: ${input.commentId}`);
  if (data.deleted_at) return;
  if (data.author_user_id !== input.authorUserId) {
    throw new CommentValidationError("authorUserId", "only author can delete");
  }
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_comments")
    .update({ deleted_at: nowIso })
    .eq("id", data.id);
  await publishEvent(
    {
      eventType: "requisition.comment_deleted",
      eventCategory: "ap",
      firmId: data.firm_id,
      firmClientId: data.firm_client_id,
      aggregateType: "requisition",
      aggregateId: data.requisition_id,
      actorType: "user",
      actorId: input.authorUserId,
      payload: { comment_id: data.id },
    },
    supabase,
  );
}

export async function listComments(requisitionId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_comments")
    .select("id, parent_comment_id, author_user_id, body, edited_at, deleted_at, created_at")
    .eq("requisition_id", requisitionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`list comments failed: ${error.message}`);
  return data ?? [];
}
