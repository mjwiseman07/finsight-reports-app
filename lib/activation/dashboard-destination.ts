/**
 * Dashboard-first activation helpers.
 * Legacy /onboarding is compatibility plumbing only — never wizard-state authority.
 */

/** Query keys dropped when redirecting /onboarding → /dashboard (wizard state). */
export const ONBOARDING_WIZARD_QUERY_KEYS = ["step"] as const;

/**
 * Keys preserved from legacy /onboarding URLs onto /dashboard
 * (activation / oauth / checkout signals — not wizard steps).
 */
export const ONBOARDING_PRESERVED_QUERY_KEYS = [
  "leadId",
  "qbError",
  "checkout",
  "tier",
  "provider",
  "paid",
  "quickBooksConnected",
  "accountingConnected",
  "xeroConnected",
  "connectionId",
  "companyName",
  "industryType",
  "firstPackage",
  "accountType",
  "superAdmin",
  "companyTemplate",
  "intuitError",
] as const;

export function isLegacyOnboardingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || "";
  return path === "/onboarding" || path.startsWith("/onboarding/");
}

/**
 * Normalize OAuth / post-auth returnTo so stale /onboarding destinations
 * never win over the dashboard activation OS.
 * Subroutes under /onboarding/* (e.g. baseline-harvest) are left alone when
 * they are explicit deep links; bare /onboarding and /onboarding?… map to dashboard.
 */
export function normalizeActivationReturnTo(
  returnTo: string | null | undefined,
  fallback = "/dashboard",
): string {
  const raw = String(returnTo || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  const pathOnly = raw.split("?")[0] || "";
  // Exact /onboarding (with or without query) → dashboard. Keep deeper subroutes.
  if (pathOnly === "/onboarding") return fallback;
  return raw;
}

export type CompatibilityRedirectInput = {
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined> | null;
};

function readParam(
  params: CompatibilityRedirectInput["searchParams"],
  key: string,
): string | null {
  if (!params) return null;
  if (params instanceof URLSearchParams) {
    const v = params.get(key);
    return v && v.trim() ? v : null;
  }
  const raw = params[key];
  if (Array.isArray(raw)) {
    const v = raw[0];
    return v && String(v).trim() ? String(v) : null;
  }
  if (raw == null) return null;
  const v = String(raw).trim();
  return v || null;
}

/**
 * Build /dashboard URL from a legacy /onboarding request.
 * Drops wizard `step=` (and any ONBOARDING_WIZARD_QUERY_KEYS).
 * Preserves activation-relevant query keys only.
 */
export function buildDashboardCompatibilityHref(
  input: CompatibilityRedirectInput = {},
): string {
  const out = new URLSearchParams();
  for (const key of ONBOARDING_PRESERVED_QUERY_KEYS) {
    if ((ONBOARDING_WIZARD_QUERY_KEYS as readonly string[]).includes(key)) continue;
    const value = readParam(input.searchParams, key);
    if (value) out.set(key, value);
  }
  const qs = out.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}
