/**
 * D6.4d — Shared review-item detail loader for API routes.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { AuthenticatedFirmContext } from "@/lib/reviewer/auth";
import type { ReviewItemDetail } from "@/lib/pre-close/reviewer-types";
import {
  mapLedgerEvents,
  mapRemediationLog,
  mapReviewItemDetail,
} from "@/lib/reviewer/queue-helpers";

export async function loadReviewItemForFirm(
  id: string,
  ctx: AuthenticatedFirmContext,
): Promise<ReviewItemDetail | null> {
  const supabase = createServiceClient();

  const { data: item, error } = await supabase
    .from("pre_close_review_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !item) return null;

  const { data: engagement } = await supabase
    .from("engagements")
    .select("id, firm_id, engagement_name")
    .eq("id", item.engagement_id)
    .maybeSingle();
  if (!engagement || !ctx.firmIds.includes(engagement.firm_id as string)) {
    return null;
  }

  const [{ data: client }, { data: attempt }, { data: ledgerEvents }, { data: remediation }] =
    await Promise.all([
      supabase.from("firm_clients").select("name").eq("id", item.firm_client_id).maybeSingle(),
      item.posted_je_attempt_id
        ? supabase
            .from("je_post_attempts")
            .select("qbo_je_id")
            .eq("attempt_id", item.posted_je_attempt_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("ledger_events")
        .select("event_id, event_type, event_category, created_at, payload")
        .eq("aggregate_type", "pre_close_review_item")
        .eq("aggregate_id", id)
        .in("event_category", ["directive", "posting", "reviewer_ui"])
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_action_log")
        .select("created_at, action_type, action_category, input_summary, output_summary")
        .like("input_summary", `review_item=${id}%`)
        .in("action_category", ["posting_remediation", "posting_attempt", "posting_blocked"])
        .order("created_at", { ascending: true }),
    ]);

  return mapReviewItemDetail(item, {
    firmClientName: (client?.name as string) ?? "",
    engagementName: (engagement.engagement_name as string) ?? "",
    qboJeId: (attempt?.qbo_je_id as string | null) ?? null,
    postingLedgerEvents: mapLedgerEvents(ledgerEvents ?? []),
    remediationLog: mapRemediationLog(remediation ?? []),
  });
}

export async function assertWriterForEngagement(
  engagementId: string,
  ctx: AuthenticatedFirmContext,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("engagements")
    .select("firm_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (!data) return false;
  return ctx.writerFirmIds.includes(data.firm_id as string);
}
