// File: app/api/admin/demo-accounts/list/route.ts
//
// GET — returns both demo firms with per-holder QBO connection status.
// Super-admin only.

import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { DEMO_FIRMS, type SandboxHolderSpec } from "@/lib/demo/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HolderView {
  slot: number;
  email: string;
  label: string;
  userId: string | null;
  connection: {
    status: "connected" | "no_connection" | "stale";
    realmId: string | null;
    entityName: string | null;
    updatedAt: string | null;
  };
}

interface DemoFirmView {
  firmId: string;
  firmName: string;
  tierKey: string;
  firmClientId: string;
  currentOwnerUserId: string | null;
  currentOwnerSlot: number | null;
  holders: HolderView[];
}

export async function GET(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  const supabase = getSupabaseAdmin();

  const emailsToLookup = DEMO_FIRMS.flatMap((f) =>
    f.holders.map((h) => h.email),
  );

  // Fetch all sandbox holder users (up to 1000 total in prod — well under
  // listUsers page cap).
  const { data: usersPage, error: usersErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 });
  }

  const emailToUserId = new Map<string, string>();
  for (const u of usersPage.users) {
    if (u.email && emailsToLookup.includes(u.email)) {
      emailToUserId.set(u.email, u.id);
    }
  }

  // Fetch active accounting_connections for all holder user_ids in one shot.
  const holderUserIds = Array.from(emailToUserId.values());
  const { data: connections, error: connErr } = await supabase
    .from("accounting_connections")
    .select("user_id, tenant_or_realm_id, external_entity_name, status, updated_at")
    .in("user_id", holderUserIds.length > 0 ? holderUserIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("provider", "quickbooks");
  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }

  const userIdToConn = new Map<string, (typeof connections)[number]>();
  for (const c of connections ?? []) {
    if (c.user_id && !userIdToConn.has(c.user_id)) {
      userIdToConn.set(c.user_id, c);
    }
  }

  // Fetch current firm_client owners so we can highlight the active slot.
  const firmClientIds = DEMO_FIRMS.map((f) => f.firmClientId);
  const { data: firmClientRows, error: fcErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id")
    .in("id", firmClientIds);
  if (fcErr) {
    return NextResponse.json({ error: fcErr.message }, { status: 500 });
  }

  const firmClientIdToOwnerUserId = new Map<string, string | null>();
  for (const row of firmClientRows ?? []) {
    firmClientIdToOwnerUserId.set(row.id, row.owner_user_id ?? null);
  }

  const view: DemoFirmView[] = DEMO_FIRMS.map((firm) => {
    const currentOwnerUserId = firmClientIdToOwnerUserId.get(firm.firmClientId) ?? null;
    let currentOwnerSlot: number | null = null;

    const holders: HolderView[] = firm.holders.map((h: SandboxHolderSpec, i: number) => {
      const slot = i + 1;
      const userId = emailToUserId.get(h.email) ?? null;
      if (userId && userId === currentOwnerUserId) currentOwnerSlot = slot;

      const conn = userId ? userIdToConn.get(userId) : undefined;
      const status: HolderView["connection"]["status"] = !conn
        ? "no_connection"
        : conn.status === "connected"
          ? "connected"
          : "stale";

      return {
        slot,
        email: h.email,
        label: h.label,
        userId,
        connection: {
          status,
          realmId: conn?.tenant_or_realm_id ?? null,
          entityName: conn?.external_entity_name ?? null,
          updatedAt: conn?.updated_at ?? null,
        },
      };
    });

    return {
      firmId: firm.firmId,
      firmName: firm.firmName,
      tierKey: firm.tierKey,
      firmClientId: firm.firmClientId,
      currentOwnerUserId,
      currentOwnerSlot,
      holders,
    };
  });

  return NextResponse.json({ firms: view });
}
