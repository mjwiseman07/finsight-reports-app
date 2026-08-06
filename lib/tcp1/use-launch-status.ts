"use client";

/**
 * Phase MINOR N2 — client-safe launch-status gate for marketing surfaces.
 *
 * Single source of truth: lib/product-tiers.js TIERS[tierKey].launch_status.
 * When status is not "live", the marketing card is hidden EXCEPT for super-admin
 * users (email allowlisted AND app_metadata/user_metadata role === "super_admin"),
 * mirroring the LAUNCH_STATUS docstring: "Super-admin can always see it."
 *
 * This is a VISIBILITY gate only — checkout enforcement lives in middleware
 * (isReviewAssistGated in lib/tcp1/launch-gates.ts) and in the checkout API
 * route (body-inspection guard). Two-layer defense: hiding here does not
 * substitute for the middleware/API gate; those still block direct-URL access.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTier, LAUNCH_STATUS } from "@/lib/product-tiers";
import { SUPER_ADMIN_ROLE, isAllowedSuperAdminEmail } from "@/lib/super-admin";

export type LaunchStatusVisibility = {
  /** True once the async auth check has resolved. Prevents SSR/CSR flash. */
  ready: boolean;
  /** True when the marketing card + CTA should be shown to this viewer. */
  visible: boolean;
  /** True when viewer is a super-admin seeing a non-live tier via bypass. */
  bypassing: boolean;
  /** Raw launch_status from the tier registry, or null if tier not found. */
  status: string | null;
};

export function useLaunchStatus(tierKey: string): LaunchStatusVisibility {
  const [ready, setReady] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user?.email) {
          setIsSuperAdmin(false);
          return;
        }
        // Mirror lib/super-admin-security.js:82–102 exactly — email allowlist
        // AND app_metadata OR user_metadata role. Client check is visibility-only;
        // the server audits the same predicates before granting any privilege.
        const emailAllowed = isAllowedSuperAdminEmail(user.email);
        const appRole = (user.app_metadata as { role?: string } | undefined)?.role;
        const userRole = (user.user_metadata as { role?: string } | undefined)?.role;
        const roleMatch = appRole === SUPER_ADMIN_ROLE || userRole === SUPER_ADMIN_ROLE;
        setIsSuperAdmin(emailAllowed && roleMatch);
      } catch {
        // Auth error — treat as non-super-admin, gate closed.
        if (!cancelled) setIsSuperAdmin(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tier = getTier(tierKey) as { launch_status?: string } | null | undefined;
  const status: string | null = tier?.launch_status ?? null;
  // Legacy tiers (no launch_status field) are treated as live — matches
  // getLiveTiers() semantics in lib/product-tiers.js:1533.
  const isLive = status === null || status === undefined || status === LAUNCH_STATUS.LIVE;
  const visible = isLive || isSuperAdmin;
  const bypassing = !isLive && isSuperAdmin;

  return { ready, visible, bypassing, status };
}
