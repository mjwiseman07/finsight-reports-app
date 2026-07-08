import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendDraftedResponse,
  resolveInboxEngagementId,
  PermanentExclusionError,
} from "@/lib/ap-intake/inbox/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data: drafts, error } = await supabase
    .from("ap_inbox_drafted_responses")
    .select("id, firm_id, message_id")
    .eq("autonomy_decision", "auto_send_pending")
    .is("sent_at", null)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ draft_id: string; sent: boolean; reason?: string; sent_message_id?: string }> = [];
  for (const d of drafts ?? []) {
    const firmId = d.firm_id as string;
    const engagementId = await resolveInboxEngagementId(firmId);
    if (!engagementId) {
      results.push({ draft_id: d.id as string, sent: false, reason: "no_engagement" });
      continue;
    }
    const { data: msg } = await supabase
      .from("vendor_ap_inbox_messages")
      .select("firm_client_id")
      .eq("id", d.message_id as string)
      .maybeSingle();
    try {
      const out = await sendDraftedResponse({
        firmId,
        firmClientId: (msg?.firm_client_id as string) ?? firmId,
        engagementId,
        draftId: d.id as string,
      });
      results.push({ draft_id: d.id as string, sent: true, sent_message_id: out.sent_message_id });
    } catch (e) {
      if (e instanceof PermanentExclusionError) {
        results.push({
          draft_id: d.id as string,
          sent: false,
          reason: `permanent_exclusion:${e.enforcementPath}`,
        });
      } else {
        results.push({ draft_id: d.id as string, sent: false, reason: (e as Error).message });
      }
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
