import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { classifyAndPersistTieOutKinds } from "@/lib/audit-ready/tie-out-kind-classifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { useLLMFallback?: boolean };

export async function POST(
  request: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!actor.canWrite) return NextResponse.json({ error: "read_only" }, { status: 403 });
  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    /* ok — default */
  }
  const summary = await classifyAndPersistTieOutKinds({
    engagementId,
    calledByUserId: actor.userId,
    useLLMFallback: body.useLLMFallback !== false, // default true
  });
  return NextResponse.json(summary);
}
