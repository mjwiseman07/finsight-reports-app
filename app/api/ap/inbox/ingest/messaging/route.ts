import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { ingestMessage } from "@/lib/ap-intake/inbox/service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import { PilotFeatureDenied } from "@/lib/entitlements/pilot-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const result = await ingestMessage({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      channel: "messaging",
      externalMessageId: body.external_message_id,
      subject: body.subject,
      bodyText: String(body.body_text ?? body.bodyText),
      bodyHtml: body.body_html ?? body.bodyHtml,
      senderAddress: String(body.sender_address ?? body.senderAddress),
      attachments: body.attachments,
      rawPayload: body.raw_payload ?? body.rawPayload ?? {},
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    return authErrorResponse(e);
  }
}
