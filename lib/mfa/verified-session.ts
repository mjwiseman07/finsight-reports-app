/**
 * Cryptographically verified Supabase session identifiers via auth.getClaims().
 * Never derive session_id from unverified JWT decode — use this helper only.
 */
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { createMfaUserClient } from "@/lib/mfa/server";

export type VerifiedSupabaseSession = {
  userId: string;
  sessionId: string;
  aal: "aal1" | "aal2";
};

async function readAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function createClaimsClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolve user + session_id from a server-validated access token (getClaims).
 * Returns null when the token is missing, invalid, or fails user binding.
 */
export async function resolveVerifiedSupabaseSession(
  expectedUserId?: string,
  accessTokenOverride?: string,
): Promise<VerifiedSupabaseSession | null> {
  const token = accessTokenOverride ?? (await readAccessTokenFromCookies());
  if (!token) return null;

  const supabase = accessTokenOverride
    ? createClaimsClient(accessTokenOverride)
    : await createMfaUserClient();

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;

  const claims = data.claims as {
    sub?: string;
    session_id?: string;
    aal?: string;
  };
  const userId = claims.sub;
  const sessionId = claims.session_id;
  if (!userId || !sessionId) return null;
  if (expectedUserId && userId !== expectedUserId) return null;

  return {
    userId,
    sessionId,
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
  };
}
