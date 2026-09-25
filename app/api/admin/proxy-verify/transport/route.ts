import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { runQuotaGuardTransportProbes } from "@/lib/network/transport-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/proxy-verify/transport
 *
 * Super-admin diagnostic matrix for QuotaGuard / Undici transport.
 * Returns runtime Node/Undici versions + sanitized probe results.
 * Never returns proxy passwords, bearer tokens, realm ids, or query strings.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
  };
  if (access.response) return access.response;

  const result = await runQuotaGuardTransportProbes();

  const failedProbe = result.probes.find((p) => !p.ok && p.error);
  const networkErr = failedProbe?.error ?? null;

  return NextResponse.json({
    ok: result.probes.every((p) => p.ok || p.notes === "QuotaGuard dispatcher unavailable"),
    generated_at: new Date().toISOString(),
    versions: result.versions,
    quotaGuardConfigured: result.quotaGuardConfigured,
    quotaGuardUrlMeta: result.quotaGuardUrlMeta,
    expectedStaticIps: result.expectedStaticIps,
    observedEgressIp: result.observedEgressIp,
    egressMatchesStaticPair: result.egressMatchesStaticPair,
    probes: result.probes,
    // Convenience summary for the current production failure mode.
    summary: {
      networkErr: networkErr
        ? { name: networkErr.name, message: networkErr.message, code: networkErr.code ?? null }
        : null,
      networkErrCause: networkErr?.deepest
        ? {
            name: networkErr.deepest.name,
            message: networkErr.deepest.message,
            code: networkErr.deepest.code ?? null,
            errno: networkErr.deepest.errno ?? null,
            syscall: networkErr.deepest.syscall ?? null,
            hostname: networkErr.deepest.hostname ?? null,
            port: networkErr.deepest.port ?? null,
            address: networkErr.deepest.address ?? null,
          }
        : null,
      anyHttpResponseReached: result.probes.some((p) => p.reachedHttpResponse),
      anyIntuitTid: result.probes.some((p) => Boolean(p.intuitTid)),
    },
  });
}
