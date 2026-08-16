import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";

type AuthClient = {
  auth: {
    setSession: (tokens: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ error: { message?: string } | null }>;
  };
};

/**
 * Consume Supabase implicit-flow tokens from the URL hash
 * (`#access_token=…&refresh_token=…`) into the browser session + Advisacor token stores.
 * Clears the hash so tokens are not left in the address bar.
 */
export async function consumeAuthHashFromUrl(supabase: AuthClient): Promise<{
  consumed: boolean;
  error?: string;
}> {
  if (typeof window === "undefined") return { consumed: false };

  const rawHash = String(window.location.hash || "").replace(/^#/, "");
  if (!rawHash || !rawHash.includes("access_token=")) {
    return { consumed: false };
  }

  const params = new URLSearchParams(rawHash);
  const accessToken = String(params.get("access_token") || "").trim();
  const refreshToken = String(params.get("refresh_token") || "").trim();
  const expiresIn = Number(params.get("expires_in") || 3600);

  // Always strip auth hash first so a failed setSession cannot leave secrets in the URL.
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, "", cleanUrl);

  if (!accessToken || !refreshToken) {
    return { consumed: false, error: "Auth link was missing tokens." };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    return { consumed: false, error: error.message || "Unable to establish session from auth link." };
  }

  window.localStorage.setItem("supabase_access_token", accessToken);
  const maxAge = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;

  return { consumed: true };
}
