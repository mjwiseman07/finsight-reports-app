import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { qboApiFetch } from "../../../../lib/qbo/api-fetch.js";

const cache = new Map<string, { expires: number; accounts: Array<{ id: string; name: string }> }>();
const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    await requireFirmAuth(req);
    const firmClientId = req.nextUrl.searchParams.get("firmClientId");
    if (!firmClientId) {
      return NextResponse.json({ error: "firmClientId_required" }, { status: 400 });
    }

    const hit = cache.get(firmClientId);
    if (hit && hit.expires > Date.now()) {
      return NextResponse.json({ accounts: hit.accounts });
    }

    const token = await resolveQBOTokenForFirmClient(firmClientId);
    if (!token) {
      return NextResponse.json({ accounts: [] });
    }
    const base = process.env.QBO_API_BASE || "https://quickbooks.api.intuit.com";
    const url = `${base}/v3/company/${token.realmId}/query?query=${encodeURIComponent("SELECT Id, Name FROM Account MAXRESULTS 500")}`;
    const { ok, json } = await qboApiFetch(url, {
      accessToken: token.accessToken,
      method: "GET",
    });
    if (!ok) {
      return NextResponse.json({ accounts: [] });
    }
    const accounts = (
      (json as { QueryResponse?: { Account?: Array<{ Id?: string; Name?: string }> } })
        ?.QueryResponse?.Account ?? []
    ).map((a) => ({
      id: String(a.Id ?? ""),
      name: String(a.Name ?? ""),
    }));

    cache.set(firmClientId, { expires: Date.now() + TTL_MS, accounts });
    return NextResponse.json({ accounts });
  } catch (e) {
    return authErrorResponse(e);
  }
}
