import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import {
  getQuotaGuardAllowlist,
  shouldRouteThroughQuotaGuard,
} from "@/lib/network/selective-dispatcher";
import {
  getQuotaGuardStaticIps,
  isQuotaGuardConfigured,
} from "@/lib/network/quotaguard-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROBE_HOSTS = [
  "quickbooks.api.intuit.com",
  "jzmdgwwiestcmmeuhhkr.supabase.co",
  "api.stripe.com",
  "api.datadoghq.com",
  "api.vercel.com",
];

/**
 * GET /api/admin/diag/network
 * Super-admin-only. Reports QuotaGuard allowlist + probe routing decisions.
 *
 * Auth adapted to repo's resolveSuperAdminAccess shape ({ response } |
 * { userId, email, role }) — paste's access.ok/status is not used here.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const access = await resolveSuperAdminAccess(req);
  if (access.response) return access.response;

  const allowlist = getQuotaGuardAllowlist();
  const staticIps = getQuotaGuardStaticIps();
  const configured = isQuotaGuardConfigured();

  const probes = PROBE_HOSTS.map((host) => ({
    host,
    routes_via_quotaguard: shouldRouteThroughQuotaGuard(host),
  }));

  return NextResponse.json({
    quotaguard_configured: configured,
    static_ips: staticIps,
    allowlist,
    probes,
    generated_at: new Date().toISOString(),
  });
}
