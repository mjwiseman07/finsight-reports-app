import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import {
  recordObservation,
  type ObservationType,
  type SourceLayer,
} from "@/lib/ap-intake/selfgov/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const body = await req.json();
    const result = await recordObservation({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      sourceLayer: body.source_layer as SourceLayer,
      observationType: body.observation_type as ObservationType,
      targetSetting: String(body.target_setting),
      observedValue: (body.observed_value as Record<string, unknown>) ?? {},
      actorUserId: String(body.actor_user_id ?? auth.userId),
      contextSummary: body.context_summary as Record<string, unknown> | undefined,
      causingEventId: body.causing_event_id ? String(body.causing_event_id) : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
