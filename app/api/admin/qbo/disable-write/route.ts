import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firmClientId = (body.firm_client_id ?? body.firmClientId) as string | undefined;
  const reason = (body.reason as string) ?? null;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client_id is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const disabledAt = new Date().toISOString();
    const { error } = await supabase
      .from("firm_clients")
      .update({
        qbo_write_enabled: false,
        qbo_write_enabled_by_user_id: access.userId ?? null,
        qbo_write_enabled_at: disabledAt,
      })
      .eq("id", firmClientId);
    if (error) throw new Error(error.message);

    // Best-effort escalation audit; do not fail the request if this errors.
    const { error: auditErr } = await supabase.from("escalation_audit").insert({
      firm_client_id: firmClientId,
      escalation_reason: "qbo_write_disabled",
      triggered_by: "user",
      context: { reason, disabled_by_user_id: access.userId ?? null },
    });
    if (auditErr) {
      console.warn("[qbo/disable-write] escalation_audit insert failed", {
        firmClientId,
        message: auditErr.message,
      });
    }

    return NextResponse.json(
      { success: true, firm_client_id: firmClientId, disabled_at: disabledAt },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
