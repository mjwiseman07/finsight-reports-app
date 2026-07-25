import { NextResponse } from "next/server";
import {
  getEngagementActor,
  requireAuditReadyUser,
} from "@/lib/audit-ready/server-auth";
import {
  emitMemoryEvent,
  type MemoryEventType,
} from "@/lib/audit-ready/memory/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLIENT_ALLOWED_EVENT_TYPES: MemoryEventType[] = ["copy_clicked"];

export async function POST(req: Request) {
  const authResult = await requireAuditReadyUser();
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const eventType = (body as { event_type?: unknown }).event_type as
    | MemoryEventType
    | undefined;
  if (
    typeof eventType !== "string" ||
    !CLIENT_ALLOWED_EVENT_TYPES.includes(eventType)
  ) {
    return NextResponse.json(
      { error: "event_type not client-emittable" },
      { status: 400 },
    );
  }

  const engagementId = (body as { engagement_id?: unknown }).engagement_id;
  if (typeof engagementId !== "string" || engagementId.length === 0) {
    return NextResponse.json(
      { error: "engagement_id required" },
      { status: 400 },
    );
  }

  const actor = await getEngagementActor(engagementId);
  if (!actor || !actor.canRead) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = (body as { payload?: unknown }).payload;
  await emitMemoryEvent({
    eventType,
    engagementId,
    actorUserId: authResult.user.id,
    payload:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {},
  });

  return NextResponse.json({ ok: true });
}
