import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import {
  getQuotaGuardStaticIps,
  getQuotaGuardUndiciDispatcher,
  isQuotaGuardConfigured,
} from "@/lib/network/quotaguard-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only smoke test: hits https://api.ipify.org through QuotaGuard's
 * proxy and asserts the response IP matches one of our static IPs.
 * Returns 200 with { ok, egressIp, expected, proxyActive } on success.
 * Returns 5xx with details on failure.
 *
 * Auth: mirrors other admin routes via resolveSuperAdminAccess (Bearer +
 * super_admin role + allowlisted email).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const access = (await resolveSuperAdminAccess(req)) as { response?: NextResponse };
  if (access.response) return access.response;

  const expected = getQuotaGuardStaticIps();
  const configured = isQuotaGuardConfigured();

  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        proxyActive: false,
        reason: "QUOTAGUARD_PROXY_URL not set on this deployment",
        expected,
      },
      { status: 503 },
    );
  }

  const dispatcher = getQuotaGuardUndiciDispatcher();

  try {
    const resp = await fetch("https://api.ipify.org?format=json", {
      method: "GET",
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!resp.ok) {
      return NextResponse.json(
        {
          ok: false,
          proxyActive: true,
          reason: `api.ipify.org responded ${resp.status}`,
          expected,
        },
        { status: 502 },
      );
    }

    const body = (await resp.json()) as { ip?: string };
    const egressIp = body?.ip;
    const matches = egressIp ? expected.includes(egressIp) : false;

    return NextResponse.json(
      {
        ok: matches,
        proxyActive: true,
        egressIp,
        expected,
        matches,
      },
      { status: matches ? 200 : 500 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        proxyActive: true,
        error: err instanceof Error ? err.message : String(err),
        expected,
      },
      { status: 500 },
    );
  }
}
