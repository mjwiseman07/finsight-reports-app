import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only: reports SAFE metadata about QUOTAGUARD_PROXY_URL without
 * revealing the password. Used to diagnose why proxy-verify fetch fails.
 *
 * Returns (200 JSON):
 *   - set:                       boolean — is env var populated
 *   - length:                    total length of the URL string
 *   - startsWithHttps/Http:      scheme sanity
 *   - endsWithNewline/Space/N:   detects paste-corruption artifacts
 *   - parses:                    boolean — did URL constructor accept it
 *   - parseError:                error message if failed to parse
 *   - scheme, hostname, port:    parsed pieces
 *   - usernameLen, passwordLen:  character counts (never the values)
 *   - passwordFirst2/Last2:      first/last 2 chars of password so caller
 *                                can eyeball match against QuotaGuard
 *                                dashboard value
 *   - specialCharsInDecodedPassword:
 *                                array of chars in the decoded password
 *                                that would need URL-encoding if embedded
 *                                raw in a URL userinfo (indicator of an
 *                                encoding mistake on paste)
 *   - manualRegexMatches:        does raw URL match http(s)://u:p@h:port
 *                                pattern via strict regex
 *   - manualUsername, manualHostname, manualPort, manualPasswordLen:
 *                                pieces per manual regex — useful if URL
 *                                constructor auto-corrected something
 *
 * Auth: super-admin only. Password value is never included in response.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const access = (await resolveSuperAdminAccess(req)) as { response?: NextResponse };
  if (access.response) return access.response;

  const raw = process.env.QUOTAGUARD_PROXY_URL;
  if (!raw) {
    return NextResponse.json({ set: false }, { status: 200 });
  }

  const meta: Record<string, unknown> = {
    set: true,
    length: raw.length,
    startsWithHttps: raw.startsWith("https://"),
    startsWithHttp: raw.startsWith("http://"),
    endsWithNewline: raw.endsWith("\n"),
    endsWithSpace: raw.endsWith(" "),
    endsWithN: raw.endsWith("n") && !raw.endsWith("in") && !raw.endsWith("en"),
  };

  try {
    const u = new URL(raw);
    meta.parses = true;
    meta.scheme = u.protocol;
    meta.hostname = u.hostname;
    meta.port = u.port;
    meta.pathname = u.pathname;
    meta.hasUsername = Boolean(u.username);
    meta.hasPassword = Boolean(u.password);
    meta.usernameLen = u.username.length;
    meta.passwordLen = u.password.length;
    const pw = u.password;
    meta.passwordFirst2 = pw.slice(0, 2);
    meta.passwordLast2 = pw.slice(-2);
    const specialsFound: string[] = [];
    for (const c of ["@", "/", ":", "#", "?", "%", "+", "&", "="]) {
      if (pw.includes(c)) specialsFound.push(c);
    }
    meta.specialCharsInDecodedPassword = specialsFound;

    const manualMatch = raw.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)(\/.*)?$/);
    meta.manualRegexMatches = Boolean(manualMatch);
    if (manualMatch) {
      meta.manualPasswordLen = manualMatch[3].length;
      meta.manualUsername = manualMatch[2];
      meta.manualHostname = manualMatch[4];
      meta.manualPort = manualMatch[5];
    }
  } catch (err) {
    meta.parses = false;
    meta.parseError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(meta, { status: 200 });
}
