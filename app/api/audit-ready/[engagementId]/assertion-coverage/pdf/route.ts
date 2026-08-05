import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  getEngagementActor,
  requireAuditReadyUser,
} from "@/lib/audit-ready/server-auth";
import { buildLifecycleCoverageOverlay } from "@/lib/pilot-lifecycle/coverage-overlay";
import { generateAuditReadyCoveragePdf } from "@/lib/pilot-lifecycle/pdf/AuditReadyCoveragePdf";
import { recordIssue } from "@/lib/pilot-lifecycle/issue-recorder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;
  if (!engagementId) {
    return NextResponse.json({ error: "engagement_id required" }, { status: 400 });
  }

  try {
    const auth = await requireAuditReadyUser();
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const actor = await getEngagementActor(engagementId);
    if (!actor || !actor.canRead) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    const { data: engagement, error: engErr } = await supabase
      .from("audit_ready_engagements")
      .select(
        "id, company_id, firm_id, firm_client_id, engagement_name, audit_period_start, audit_period_end",
      )
      .eq("id", engagementId)
      .maybeSingle();
    if (engErr || !engagement) {
      return NextResponse.json({ error: "engagement_not_found" }, { status: 404 });
    }

    if (!engagement.company_id && !engagement.firm_id) {
      return NextResponse.json(
        { error: "engagement_missing_partition" },
        { status: 422 },
      );
    }

    // Chain-integrity gate (D10) — XOR args: pass exactly one partition key.
    const { data: breaks, error: verifyErr } = await supabase.rpc(
      "pilot_lifecycle_events_verify_chain",
      {
        p_company_id: engagement.company_id ?? null,
        p_firm_id: engagement.firm_id ?? null,
      },
    );
    if (verifyErr) {
      return NextResponse.json(
        { error: "chain_verify_failed", detail: verifyErr.message },
        { status: 500 },
      );
    }
    const breakArr = Array.isArray(breaks) ? breaks : [];
    if (breakArr.length > 0) {
      const first = breakArr[0] as {
        first_broken_event_id: string;
        expected_row_hash?: string;
        actual_row_hash?: string;
      };
      await recordIssue({
        fingerprint: `chain-broken:on-demand:${engagement.company_id ?? "null"}:${engagement.firm_id ?? "null"}:${first.first_broken_event_id}`,
        level: "fatal",
        issueKind: "pilot.lifecycle.chain.integrity.broken",
        companyId: engagement.company_id,
        firmId: engagement.firm_id,
        tags: {
          detected_by: "assertion-coverage-pdf-route",
          engagement_id: engagement.id,
        },
        extra: {
          first_broken_event_id: first.first_broken_event_id,
          expected_row_hash: first.expected_row_hash,
          actual_row_hash: first.actual_row_hash,
        },
        message: `Chain break detected during AR coverage PDF generation for engagement ${engagement.id}`,
      });
      return NextResponse.json(
        {
          error: "chain_integrity_broken",
          break_count: breakArr.length,
          first_broken_event_id: first.first_broken_event_id,
        },
        { status: 409 },
      );
    }
    const chainVerifiedAt = new Date().toISOString();

    let firmClientName: string | null = engagement.engagement_name ?? null;
    if (engagement.firm_client_id) {
      const { data: fc } = await supabase
        .from("firm_clients")
        .select("name")
        .eq("id", engagement.firm_client_id)
        .maybeSingle();
      firmClientName = fc?.name ?? firmClientName;
    }

    const overlay = await buildLifecycleCoverageOverlay({
      companyId: engagement.company_id,
      firmId: engagement.firm_id,
      supabase,
    });

    const periodLabel =
      engagement.audit_period_start && engagement.audit_period_end
        ? `${engagement.audit_period_start} → ${engagement.audit_period_end}`
        : `Engagement ${engagement.id.slice(0, 8)}`;

    const { buffer, sha256, byteSize } = await generateAuditReadyCoveragePdf({
      engagement: {
        id: engagement.id,
        company_id: engagement.company_id,
        firm_id: engagement.firm_id,
        firm_client_name: firmClientName,
        period_label: periodLabel,
      },
      overlay,
      chain: { verified_at: chainVerifiedAt, is_intact: true, break_count: 0 },
    });

    await supabase.from("pilot_lifecycle_coverage_downloads").insert({
      engagement_id: engagement.id,
      company_id: engagement.company_id,
      firm_id: engagement.firm_id,
      requested_by_user_id: user.id,
      requested_by_email: user.email ?? null,
      content_sha256: sha256,
      byte_size: byteSize,
      overlay_event_count: overlay.total_evidence_events,
      overlay_assertion_count: overlay.distinct_pcaob_assertions,
      reconciliation_warning_count: overlay.warnings.length,
      chain_verified_at: chainVerifiedAt,
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="assertion-coverage-${engagement.id.slice(0, 8)}-${dateStr}.pdf"`,
        "X-Coverage-Sha256": sha256,
        "X-Chain-Verified-At": chainVerifiedAt,
        "X-Overlay-Event-Count": String(overlay.total_evidence_events),
      },
    });
  } catch (err) {
    console.error("[ar-assertion-coverage-pdf] error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
