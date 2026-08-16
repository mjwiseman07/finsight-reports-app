import { redirect } from "next/navigation";
import { buildDashboardCompatibilityHref } from "@/lib/activation/dashboard-destination";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Legacy /onboarding wizard retired.
 * Compatibility only: redirect to /dashboard activation OS.
 * Wizard `step=` is intentionally dropped (not preserved).
 */
export default async function OnboardingCompatibilityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = (await Promise.resolve(searchParams)) || {};
  redirect(buildDashboardCompatibilityHref({ searchParams: params }));
}
