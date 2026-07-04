import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireFirmAuth, authErrorResponse, ReviewerAuthError } from "@/lib/reviewer/auth";
import {
  build as buildAssertionCoverageSection,
  toAssertionCoverageStatement,
} from "@/lib/close-packet/sections/assertion_coverage";
import { generateAssertionCoverageStatementPdf } from "@/lib/close-packet/pdf/AssertionCoverageStatement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ closePeriodId: string }> },
) {
  const { closePeriodId } = await params;
  try {
    const auth = await requireFirmAuth(request);
    const supabase = getSupabaseAdmin();

    const { data: closePeriod, error: cpErr } = await supabase
      .from("close_periods")
      .select("id, firm_client_id, period_start, period_end, status")
      .eq("id", closePeriodId)
      .maybeSingle();
    if (cpErr || !closePeriod) {
      return NextResponse.json({ error: "close_period_not_found" }, { status: 404 });
    }

    const { data: firmClient, error: fcErr } = await supabase
      .from("firm_clients")
      .select("id, firm_id, name, industry_vertical, accounting_method, is_demo")
      .eq("id", closePeriod.firm_client_id)
      .single();
    if (fcErr || !firmClient) {
      return NextResponse.json({ error: "firm_client_not_found" }, { status: 404 });
    }

    if (!auth.firmIds.includes(firmClient.firm_id)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const built = await buildAssertionCoverageSection({
      closePeriod,
      firmClient,
      supabase,
    });
    if (built.status === "error") {
      return NextResponse.json(
        { error: "statement_build_failed", detail: built.error_message },
        { status: 500 },
      );
    }

    const statement = toAssertionCoverageStatement(built);
    if (!statement) {
      return NextResponse.json({ error: "statement_build_failed" }, { status: 500 });
    }

    const { buffer, sha256, byteSize } = await generateAssertionCoverageStatementPdf(statement);

    await supabase.from("assertion_coverage_statement_downloads").insert({
      close_period_id: closePeriodId,
      firm_client_id: firmClient.id,
      requested_by_user_id: auth.userId,
      requested_by_email: null,
      content_sha256: sha256,
      byte_size: byteSize,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="assertion-coverage-${closePeriod.period_start}-to-${closePeriod.period_end}.pdf"`,
        "X-Coverage-Sha256": sha256,
      },
    });
  } catch (err) {
    if (err instanceof ReviewerAuthError) {
      return authErrorResponse(err);
    }
    console.error("[coverage-pdf] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
