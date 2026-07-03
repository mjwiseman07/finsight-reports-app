import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/qbo/token-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ firmClientId: string }> },
) {
  const access = (await resolveSuperAdminAccess(request)) as { response?: NextResponse };
  if (access.response) return access.response;

  const { firmClientId } = await params;
  if (!firmClientId) {
    return NextResponse.json({ error: "firmClientId is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: client, error } = await supabase
      .from("firm_clients")
      .select(
        "id, qbo_write_enabled, qbo_write_enabled_at, qbo_last_health_check_at, qbo_last_health_check_status",
      )
      .eq("id", firmClientId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!client) {
      return NextResponse.json({ error: "firm_client not found" }, { status: 404 });
    }

    const { data: recentChecks, error: logErr } = await supabase
      .from("qbo_health_check_log")
      .select("check_status, token_source, realm_id, granted_scopes, error_message, latency_ms, checked_at")
      .eq("firm_client_id", firmClientId)
      .order("checked_at", { ascending: false })
      .limit(5);
    if (logErr) throw new Error(logErr.message);

    // Token metadata is best-effort; never fails the status call.
    let tokenSource: string | null = null;
    let realmId: string | null = null;
    let grantedScopes: string[] | null = null;
    try {
      const bundle = await resolveQBOTokenForFirmClient(firmClientId);
      if (bundle) {
        tokenSource = bundle.tokenSource;
        realmId = bundle.realmId;
        grantedScopes = bundle.grantedScopes;
      }
    } catch (err) {
      console.warn("[qbo/status] token resolve failed", {
        firmClientId,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(
      {
        firm_client_id: firmClientId,
        qbo_write_enabled: client.qbo_write_enabled,
        qbo_write_enabled_at: client.qbo_write_enabled_at,
        qbo_last_health_check_at: client.qbo_last_health_check_at,
        qbo_last_health_check_status: client.qbo_last_health_check_status,
        token_source: tokenSource,
        realm_id: realmId,
        granted_scopes: grantedScopes,
        recent_health_checks: recentChecks ?? [],
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
