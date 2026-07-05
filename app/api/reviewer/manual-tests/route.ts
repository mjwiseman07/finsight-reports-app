import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { createManualTestEvidence } from "@/lib/assertions/manual-test-service";
import { MANUAL_EVIDENCE_TYPES } from "@/lib/pre-close/manual-test-evidence-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireFirmAuth(req);
    const body = (await req.json()) as Record<string, unknown>;
    const required = [
      "firmClientId",
      "engagementId",
      "closePeriodId",
      "accountCategory",
      "assertionId",
      "evidenceType",
      "sourceType",
      "evidenceSummary",
    ];
    for (const k of required) {
      if (typeof body[k] !== "string" || (body[k] as string).trim() === "") {
        return NextResponse.json({ error: `missing_or_empty:${k}` }, { status: 400 });
      }
    }
    if (!MANUAL_EVIDENCE_TYPES.includes(body.evidenceType as (typeof MANUAL_EVIDENCE_TYPES)[number])) {
      return NextResponse.json({ error: "invalid_evidence_type" }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: eng } = await db
      .from("engagements")
      .select("firm_id")
      .eq("id", body.engagementId as string)
      .maybeSingle();
    if (!eng || !ctx.writerFirmIds.includes(eng.firm_id as string)) {
      throw new ReviewerAuthError("writer_required", 403);
    }

    const row = await createManualTestEvidence(db, {
      firmClientId: body.firmClientId as string,
      engagementId: body.engagementId as string,
      closePeriodId: body.closePeriodId as string,
      accountCategory: body.accountCategory as string,
      assertionId: body.assertionId as string,
      evidenceType: body.evidenceType as (typeof MANUAL_EVIDENCE_TYPES)[number],
      sourceType: body.sourceType as string,
      sourceKey: (body.sourceKey as Record<string, unknown>) ?? {},
      sourceAmount: (body.sourceAmount as number | null) ?? null,
      sourceDate: (body.sourceDate as string | null) ?? null,
      evidenceSummary: body.evidenceSummary as string,
      calculationNotes: (body.calculationNotes as string | null) ?? null,
      resolvesGapItemId: (body.resolvesGapItemId as string | null) ?? null,
      dataSourceReliabilityBasis: (body.dataSourceReliabilityBasis as string | null) ?? null,
      createdByUserId: ctx.userId,
      createdByDisplayName: null,
    });
    return NextResponse.json({ evidence: row });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireFirmAuth(req);
    const closePeriodId = req.nextUrl.searchParams.get("closePeriodId");
    if (!closePeriodId) {
      return NextResponse.json({ error: "closePeriodId_required" }, { status: 400 });
    }
    const db = createServiceClient();
    const { data, error } = await db
      .from("manual_test_evidence")
      .select("*")
      .eq("close_period_id", closePeriodId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data?.length) {
      const engId = data[0].engagement_id as string;
      const { data: eng } = await db
        .from("engagements")
        .select("firm_id")
        .eq("id", engId)
        .maybeSingle();
      if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ evidence: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
