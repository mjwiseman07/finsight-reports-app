import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { updateAutonomyConfig, PermanentExclusionError } from "@/lib/ap-intake/inbox/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ap_inbox_autonomy_config")
      .select("firm_id, mode, allowlist_intents, escalation_role_slug")
      .eq("firm_id", firmId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    await updateAutonomyConfig({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      mode: body.mode,
      allowlistIntents: body.allowlist_intents ?? body.allowlistIntents ?? [],
      escalationRoleSlug: body.escalation_role_slug ?? body.escalationRoleSlug,
      actorUserId: auth.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PermanentExclusionError) {
      return NextResponse.json(
        { error: e.message, intent: e.intent, enforcement_path: e.enforcementPath },
        { status: 400 },
      );
    }
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
