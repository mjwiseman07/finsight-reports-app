import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const { id: firmClientId } = await params;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ownerUserId = (body.owner_user_id ?? body.ownerUserId) as string | undefined;
  if (!ownerUserId) {
    return NextResponse.json({ error: "owner_user_id is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Target firm_client must exist; capture prior owner for the audit trail.
    const { data: firmClient, error: fcErr } = await supabase
      .from("firm_clients")
      .select("id, owner_user_id")
      .eq("id", firmClientId)
      .maybeSingle();
    if (fcErr) throw new Error(fcErr.message);
    if (!firmClient) {
      return NextResponse.json({ error: "firm_client not found" }, { status: 404 });
    }

    // owner_user_id must be a real auth user.
    const { data: userLookup, error: userErr } = await supabase.auth.admin.getUserById(ownerUserId);
    if (userErr || !userLookup?.user?.id) {
      return NextResponse.json(
        { error: "owner_user_id does not correspond to an existing user" },
        { status: 400 },
      );
    }

    // owner_user_id must have an active QBO connection.
    const { data: conn, error: connErr } = await supabase
      .from("accounting_connections")
      .select("id, tenant_or_realm_id")
      .eq("user_id", ownerUserId)
      .eq("provider", "quickbooks")
      .eq("status", "connected")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (connErr && connErr.code !== "PGRST116") throw new Error(connErr.message);
    if (!conn?.id) {
      return NextResponse.json(
        {
          error:
            "User has no active QBO connection. Have them connect at /api/accounting/connect?provider=quickbooks before assigning ownership.",
        },
        { status: 400 },
      );
    }

    const priorOwner = (firmClient.owner_user_id as string) ?? null;

    const { error: updErr } = await supabase
      .from("firm_clients")
      .update({ owner_user_id: ownerUserId })
      .eq("id", firmClientId);
    if (updErr) throw new Error(updErr.message);

    const { error: auditErr } = await supabase.from("escalation_audit").insert({
      firm_client_id: firmClientId,
      escalation_reason: "owner_assigned",
      triggered_by: "user",
      context: { from: priorOwner, to: ownerUserId, assigned_by_user_id: access.userId ?? null },
    });
    if (auditErr) {
      console.warn("[firm-clients/assign-owner] escalation_audit insert failed", {
        firmClientId,
        message: auditErr.message,
      });
    }

    return NextResponse.json(
      {
        success: true,
        firm_client_id: firmClientId,
        owner_user_id: ownerUserId,
        qbo_connection_id: conn.id,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
