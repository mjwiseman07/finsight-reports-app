import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import { requireApproval } from "@/lib/pre-close/require-approval";
import { logGap3Action } from "@/lib/pre-close/gap3-log";
import { recordQboApiTrace } from "@/lib/qbo/api-trace";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { firm_client_id, idempotency_key, source_type, source_id, payload, review_item_id } =
    body ?? {};

  if (!firm_client_id || !idempotency_key || !source_type || !payload) {
    return NextResponse.json(
      {
        error: "missing_required_fields",
        required: ["firm_client_id", "idempotency_key", "source_type", "payload", "review_item_id"],
      },
      { status: 400 },
    );
  }

  const access = (await resolveFirmAccess(req, { clientId: firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  if (!review_item_id) {
    await logGap3Action({
      firmClientId: firm_client_id,
      actionCategory: "gap3_approval",
      actionType: "gap3.post_denied_no_review_item",
      actorId: access.userId ?? null,
      inputSummary: JSON.stringify({ source_type, source_id, idempotency_key }),
    });
    return NextResponse.json(
      {
        error: "gap3_review_item_id_required",
        message:
          "Direct JE posting is disabled. Provide review_item_id from an approved pre_close_review_items row.",
      },
      { status: 403 },
    );
  }

  const gate = await requireApproval(review_item_id, firm_client_id);
  if (!gate.ok) {
    await logGap3Action({
      firmClientId: firm_client_id,
      actionCategory: "gap3_approval",
      actionType: "gap3.post_denied",
      actorId: access.userId ?? null,
      inputSummary: JSON.stringify({ reason: gate.reason, review_item_id }),
    });
    const status =
      gate.reason === "mfa_step_up_required" || gate.reason === "mfa_step_up_expired" ? 401 : 403;
    return NextResponse.json({ error: gate.reason }, { status });
  }

  const startedAt = Date.now();
  const result = await qboJournalEntryPoster.post({
    firm_client_id,
    idempotency_key,
    source_type,
    source_id,
    posted_by: gate.bundle.autonomous_lane ? "ai" : "human",
    posted_by_user_id: access.userId,
    payload,
  });

  await recordQboApiTrace({
    firm_client_id,
    endpoint: "/v3/company/{realmId}/journalentry",
    http_method: "POST",
    http_status: result.status === "posted" ? 200 : result.status === "rejected" ? 422 : 502,
    intuit_tid: (result as { intuit_tid?: string }).intuit_tid ?? null,
    latency_ms: Date.now() - startedAt,
    error_code:
      result.status !== "posted"
        ? String((result as { reason?: string; error?: string }).reason ?? result.status)
        : null,
    correlation_id: review_item_id,
  });

  if (result.status === "posted" && "attempt_id" in result) {
    const sb = createServiceClient();
    await sb
      .from("pre_close_review_items")
      .update({ posted_je_attempt_id: result.attempt_id })
      .eq("id", review_item_id)
      .is("posted_je_attempt_id", null);
  }

  const statusCode = result.status === "posted" ? 200 : result.status === "rejected" ? 422 : 502;
  return NextResponse.json(result, { status: statusCode });
}
