// File: app/api/admin/demo-accounts/bind-holder/route.ts
//
// POST — swap firm_client.owner_user_id to a specific sandbox holder.
// Super-admin only. Only accepts demo firm_client ids. Only accepts holder
// user_ids that (a) belong to a sandbox holder auth user, AND (b) have an
// active QBO connection.

import { NextResponse } from "next/server";
import {
  auditSuperAdminEvent,
  resolveSuperAdminAccess,
} from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { DEMO_FIRMS } from "@/lib/demo/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  let body: { firmClientId?: string; holderUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { firmClientId, holderUserId } = body;
  if (!firmClientId || !holderUserId) {
    return NextResponse.json(
      { error: "firmClientId and holderUserId are required" },
      { status: 400 },
    );
  }

  // Guard: only demo firm_clients allowed.
  const demoFirm = DEMO_FIRMS.find((f) => f.firmClientId === firmClientId);
  if (!demoFirm) {
    return NextResponse.json(
      { error: "firmClientId is not a demo firm_client" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Guard: holderUserId must be a sandbox holder auth user for this firm.
  const { data: userLookup, error: userLookupErr } =
    await supabase.auth.admin.getUserById(holderUserId);
  if (userLookupErr || !userLookup?.user?.id) {
    return NextResponse.json(
      { error: "holderUserId is not an existing user" },
      { status: 400 },
    );
  }

  const isSandboxHolder =
    (userLookup.user.app_metadata as Record<string, unknown> | null)?.[
      "is_demo_sandbox_holder"
    ] === true;
  if (!isSandboxHolder) {
    return NextResponse.json(
      { error: "holderUserId is not a sandbox holder" },
      { status: 400 },
    );
  }

  const holderEmailsForFirm = demoFirm.holders.map((h) => h.email);
  if (!userLookup.user.email || !holderEmailsForFirm.includes(userLookup.user.email)) {
    return NextResponse.json(
      { error: "holderUserId belongs to a different firm's holder pool" },
      { status: 400 },
    );
  }

  // Guard: holder must have an active QBO connection (mirrors assign-owner
  // route's contract).
  const { data: conn, error: connErr } = await supabase
    .from("accounting_connections")
    .select("id, tenant_or_realm_id, status")
    .eq("user_id", holderUserId)
    .eq("provider", "quickbooks")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connErr && connErr.code !== "PGRST116") {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }
  if (!conn?.id) {
    return NextResponse.json(
      {
        error:
          "Holder has no active QBO connection. Connect a sandbox to this holder via DEMO-3B first.",
      },
      { status: 400 },
    );
  }

  // Read prior owner for the audit trail.
  const { data: fcRow, error: fcReadErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id, firm_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (fcReadErr) {
    return NextResponse.json({ error: fcReadErr.message }, { status: 500 });
  }
  if (!fcRow) {
    return NextResponse.json({ error: "firm_client not found" }, { status: 404 });
  }

  const priorOwner = fcRow.owner_user_id;

  const { error: updErr } = await supabase
    .from("firm_clients")
    .update({ owner_user_id: holderUserId })
    .eq("id", firmClientId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  await auditSuperAdminEvent({
    eventType: "bind_demo_holder",
    actorUserId: access.userId ?? null,
    actorEmail: access.email ?? null,
    targetUserId: holderUserId,
    companyId: demoFirm.companyId,
    metadata: {
      firm_id: demoFirm.firmId,
      firm_client_id: firmClientId,
      tier_key: demoFirm.tierKey,
      prior_owner_user_id: priorOwner,
      realm_id: conn.tenant_or_realm_id,
    },
  });

  return NextResponse.json({
    ok: true,
    firmClientId,
    newOwnerUserId: holderUserId,
    priorOwnerUserId: priorOwner,
    realmId: conn.tenant_or_realm_id,
  });
}
