import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { listProposals } from "@/lib/learning/proposal-service";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase MC-2d.2 — mirror of resolveHomeCurrency in recurring/fires route.
 * Kept as a per-route helper (not a shared util) because the linkage is
 * route-specific — this route uses firm_clients.owner_user_id, while other
 * surfaces (e.g. cash-app reviewer / MC-2d.1) use company_id directly.
 * A future MC-2d.6 could consolidate if a third route needs the same shape.
 */
async function resolveHomeCurrency(ownerUserId: string | null | undefined): Promise<string | undefined> {
  if (!ownerUserId || !supabaseAdmin) return undefined;

  const { data, error } = await supabaseAdmin
    .from("accounting_connections")
    .select("home_currency")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    console.warn("[uncategorized/proposals GET] home_currency lookup failed:", error.message);
    return undefined;
  }

  return data?.home_currency ? String(data.home_currency).toUpperCase() : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const firmClientId = url.searchParams.get("firm_client_id");
  if (!firmClientId) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(req, { clientId: firmClientId })) as {
    response?: NextResponse;
    userId?: string;
    client?: { id: string; firm_id: string; name: string | null; owner_user_id: string | null };
  };
  if (access.response) return access.response;

  const status = url.searchParams.get("status") ?? undefined;
  const bucket = url.searchParams.get("bucket") ?? undefined;
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;

  try {
    const [proposals, homeCurrency] = await Promise.all([
      listProposals(firmClientId, { status, bucket, limit }),
      resolveHomeCurrency(access.client?.owner_user_id),
    ]);
    // Phase MC-2d.2 — denormalize home_currency onto the response envelope.
    return NextResponse.json({ proposals, home_currency: homeCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
