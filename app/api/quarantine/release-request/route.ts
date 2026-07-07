/**
 * Phase D6.5 Part 2 — Block 3
 * POST /api/quarantine/release-request
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requestQuarantineRelease,
  NoOpenQuarantineError,
} from "@/lib/ap-intake/quarantine/release-service";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import type { ReviewerTier } from "@/lib/ap-intake/quarantine/gates";

function mapMembershipRoleToTier(role: string): ReviewerTier {
  if (role === "bookkeeper") return "bookkeeper";
  if (role === "firm_admin" || role === "controller" || role === "fractional_cfo") {
    return "admin";
  }
  return "reviewer";
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ctx = await requireFirmAuth(request);
    const body = (await request.json().catch(() => ({}))) as {
      bill_id?: string;
      attestation_text?: string;
    };
    if (!body.bill_id || !body.attestation_text) {
      return NextResponse.json(
        { error: "bill_id_and_attestation_text_required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: membership } = await supabase
      .from("firm_memberships")
      .select("firm_id, role")
      .eq("user_id", ctx.userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership?.firm_id) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }

    const { data: bill } = await supabase
      .from("ap_intake_bills")
      .select("firm_id, firm_client_id")
      .eq("id", body.bill_id)
      .maybeSingle();
    if (!bill) return NextResponse.json({ error: "bill_not_found" }, { status: 404 });
    if (!ctx.firmIds.includes(bill.firm_id as string)) {
      return NextResponse.json({ error: "bill_not_in_caller_firm" }, { status: 403 });
    }

    const { data: engagement } = await supabase
      .from("engagements")
      .select("id")
      .eq("firm_id", membership.firm_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const result = await requestQuarantineRelease({
      supabase,
      firmId: bill.firm_id as string,
      firmClientId: bill.firm_client_id as string,
      billId: body.bill_id,
      releaseActorUserId: ctx.userId,
      releaseActorTier: mapMembershipRoleToTier(membership.role as string),
      attestationText: body.attestation_text,
      engagementId: engagement?.id ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoOpenQuarantineError) {
      return NextResponse.json({ error: "no_open_quarantine" }, { status: 404 });
    }
    if (err instanceof EntitlementDenied) {
      return NextResponse.json(
        { error: "entitlement_denied", detail: err.reason },
        { status: 402 },
      );
    }
    if (err && typeof err === "object" && "name" in err && err.name === "ReviewerAuthError") {
      return authErrorResponse(err);
    }
    return NextResponse.json(
      { error: "release_failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
