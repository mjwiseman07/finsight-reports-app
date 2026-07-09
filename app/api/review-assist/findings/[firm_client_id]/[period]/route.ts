/**
 * GET /api/review-assist/findings/[firm_client_id]/[period]
 *
 * Read-only findings feed for the Review Assist tier.
 * Gated on the review_assist_findings entitlement flag (firm-scoped).
 *
 * Auth: resolveFirmAccess (bearer JWT + firm membership + client scoping).
 * Gate: requireFlag(firmId, 'review_assist_findings', 'firm').
 *
 * Reference: Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum, Block 6.
 */
import { NextResponse, type NextRequest } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { requireFlag } from "@/lib/review-assist/route-guard";
import { composeReviewAssistFindings } from "@/lib/review-assist/composer";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ firm_client_id: string; period: string }> },
) {
  const params = await ctx.params;
  const firmClientId = params.firm_client_id;
  const period = params.period;

  if (!PERIOD_RE.test(period)) {
    return NextResponse.json(
      { error: "Invalid period, expected YYYY-MM", code: "INVALID_PERIOD" },
      { status: 400 },
    );
  }

  const access = await resolveFirmAccess(request, { clientId: firmClientId });
  if (access.response) return access.response;

  const client = access.client as { firm_id: string } | undefined;
  if (!client?.firm_id) {
    return NextResponse.json(
      { error: "Firm client not resolvable", code: "CLIENT_NOT_FOUND" },
      { status: 404 },
    );
  }

  const gateResponse = await requireFlag(client.firm_id, "review_assist_findings", "firm");
  if (gateResponse) return gateResponse;

  try {
    const supabase = getSupabaseAdmin();
    const payload = await composeReviewAssistFindings({
      supabase,
      firmClientId,
      period,
    });
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "Composer failed", code: "COMPOSER_ERROR", detail: message },
      { status: 500 },
    );
  }
}
