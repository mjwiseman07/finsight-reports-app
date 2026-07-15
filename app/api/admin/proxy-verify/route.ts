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
    // undici's fetch throws a TypeError with .cause chain — unwrap it so
    // callers see the actual network error (ETIMEDOUT, 407, ECONNREFUSED, etc.)
    // instead of the useless top-level "fetch failed".
    const chain: Array<{ name: string; message: string; code?: string }> = [];
    let cursor: unknown = err;
    let depth = 0;
    while (cursor && depth < 6) {
      if (cursor instanceof Error) {
        const entry: { name: string; message: string; code?: string } = {
          name: cursor.name,
          message: cursor.message,
        };
        const maybeCode = (cursor as unknown as { code?: unknown }).code;
        if (typeof maybeCode === "string") entry.code = maybeCode;
        chain.push(entry);
        cursor = (cursor as unknown as { cause?: unknown }).cause;
      } else {
        chain.push({ name: "Unknown", message: String(cursor) });
        cursor = undefined;
      }
      depth += 1;
    }
    const top = chain[0] ?? { name: "Unknown", message: "unknown error" };
    const deepest = chain[chain.length - 1] ?? top;
    return NextResponse.json(
      {
        ok: false,
        proxyActive: true,
        error: top.message,
        errorCode: top.code,
        rootError: deepest.message,
        rootErrorCode: deepest.code,
        errorChain: chain,
        expected,
      },
      { status: 500 },
    );
  }
}
