import { NextResponse } from "next/server";
import {
  getEngagementActor,
  requireAuditReadyUser,
} from "@/lib/audit-ready/server-auth";
import {
  getSimilarKickoutResolutions,
  type SimilarSourceKey,
} from "@/lib/audit-ready/memory/similar-resolutions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const engagementId = body.engagement_id;
  if (typeof engagementId !== "string" || engagementId.length === 0) {
    return NextResponse.json(
      { error: "engagement_id required" },
      { status: 400 },
    );
  }

  const sourceType = body.source_type;
  if (sourceType !== "bs_summary_line" && sourceType !== "pbc_run") {
    return NextResponse.json(
      { error: "invalid source_type" },
      { status: 400 },
    );
  }

  let key: SimilarSourceKey;
  if (sourceType === "bs_summary_line") {
    if (
      typeof body.qbo_account_id !== "string" ||
      body.qbo_account_id.length === 0
    ) {
      return NextResponse.json(
        { error: "qbo_account_id required" },
        { status: 400 },
      );
    }
    key = {
      source_type: sourceType,
      qbo_account_id: body.qbo_account_id,
    };
  } else {
    if (
      typeof body.tie_out_kind !== "string" ||
      body.tie_out_kind.length === 0
    ) {
      return NextResponse.json(
        { error: "tie_out_kind required" },
        { status: 400 },
      );
    }
    key = { source_type: sourceType, tie_out_kind: body.tie_out_kind };
  }

  const actor = await getEngagementActor(engagementId);
  if (!actor?.canRead) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const results = await getSimilarKickoutResolutions(engagementId, key);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[similar-resolutions POST]", error);
    return NextResponse.json(
      { error: "similar_resolutions_failed" },
      { status: 500 },
    );
  }
}
