import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";

const FIRM_ROLES = new Set(["firm_admin", "bookkeeper", "controller", "fractional_cfo"]);

export async function auditFirmEvent({ eventType, firmId, clientId, actorUserId, metadata = {} }) {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from("audit_logs")
    .insert({
      event_type: eventType,
      actor_user_id: actorUserId || null,
      firm_id: firmId || null,
      client_id: clientId || null,
      resource_type: "firm_portal",
      resource_id: clientId || firmId || null,
      metadata,
      created_at: new Date().toISOString(),
    })
    .throwOnError()
    .catch(() => {
      // Audit table may not exist yet in pre-launch environments.
    });
}

export async function resolveFirmAccess(request, { clientId } = {}) {
  if (!supabaseAdmin) {
    return {
      response: NextResponse.json({ error: "Supabase is not configured for the firm portal." }, { status: 503 }),
    };
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return { response: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("firm_memberships")
    .select("firm_id, role, status")
    .eq("user_id", authData.user.id)
    .eq("status", "active");

  if (membershipError?.code === "42P01") {
    return {
      response: NextResponse.json(
        { error: "Firm membership storage is not configured yet." },
        { status: 501 },
      ),
    };
  }

  if (membershipError) {
    return { response: NextResponse.json({ error: "Unable to validate firm access." }, { status: 500 }) };
  }

  const activeMemberships = (memberships || []).filter((membership) => FIRM_ROLES.has(membership.role));

  if (!activeMemberships.length) {
    return { response: NextResponse.json({ error: "Firm-level access is required." }, { status: 403 }) };
  }

  const firmIds = activeMemberships.map((membership) => membership.firm_id);

  if (!clientId) {
    return {
      userId: authData.user.id,
      memberships: activeMemberships,
      firmIds,
    };
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from("firm_clients")
    .select("id, firm_id, name, owner_user_id")
    .eq("id", clientId)
    .in("firm_id", firmIds)
    .maybeSingle();

  if (clientError?.code === "42P01") {
    return {
      response: NextResponse.json(
        { error: "Firm client storage is not configured yet." },
        { status: 501 },
      ),
    };
  }

  if (clientError) {
    return { response: NextResponse.json({ error: "Unable to validate client access." }, { status: 500 }) };
  }

  if (!client) {
    return { response: NextResponse.json({ error: "Client is not available to this firm user." }, { status: 403 }) };
  }

  return {
    userId: authData.user.id,
    memberships: activeMemberships,
    firmIds,
    client,
  };
}
