import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { listFiresForReview } from "@/lib/recurring/review-service";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase MC-2d.2 — batch-loads the tenant's home_currency from
 * accounting_connections for the resolved firm client's owner_user_id.
 * Non-fatal on lookup failure: logs and returns undefined so the UI falls
 * back to USD rather than 500ing the admin queue.
 *
 * Linkage: firm_clients.owner_user_id ↔ accounting_connections.user_id.
 * (firm_clients.company_id is the D0 memory identifier and MUST NOT be
 * used here — QBO/close-packet token paths use owner_user_id.)
 */
async function resolveHomeCurrency(ownerUserId: string | null | undefined): Promise<string | undefined> {
  if (!ownerUserId || !supabaseAdmin) return undefined;

  const { data, error } = await supabaseAdmin
    .from("accounting_connections")
    .select("home_currency")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    // Non-fatal — log and continue; UI falls back to USD.
    console.warn("[recurring/fires GET] home_currency lookup failed:", error.message);
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

  try {
    const [result, homeCurrency] = await Promise.all([
      listFiresForReview(firmClientId),
      resolveHomeCurrency(access.client?.owner_user_id),
    ]);
    // Phase MC-2d.2 — denormalize home_currency onto the response envelope.
    return NextResponse.json({ ...result, home_currency: homeCurrency });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
