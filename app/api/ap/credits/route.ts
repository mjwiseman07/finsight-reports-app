import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { issueCredit, CreditValidationError } from "@/lib/ap-intake/credits/service";
import { createServiceClient } from "@/lib/supabase/service";
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
    const id = await issueCredit({
      firmId,
      firmClientId: String(body.firm_client_id),
      engagementId: String(body.engagement_id),
      vendorId: String(body.vendor_id),
      creditType: body.credit_type,
      sourceDocumentType: body.source_document_type,
      sourceDocumentRef: body.source_document_ref,
      originalAmountCents: Number(body.original_amount_cents),
      currency: String(body.currency),
      issuedDate: String(body.issued_date),
      expirationDate: body.expiration_date,
      notes: body.notes,
      actorUserId: auth.userId,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof EntitlementDenied || e instanceof PilotFeatureDenied) {
      return NextResponse.json({ error: (e as Error).message }, { status: 403 });
    }
    if (e instanceof CreditValidationError) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    return authErrorResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("vendor_credits")
      .select("*")
      .eq("firm_id", firmId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ credits: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
