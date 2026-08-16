"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LEAD_SESSION_KEY = "advisacor_lead_dashboard_session";
const LEAD_ID_KEY = "advisacor_free_review_lead_id";

/**
 * Consume leadId once from the dashboard URL, persist lead session context,
 * then replace the URL with a clean /dashboard (preserving non-lead activation
 * params like qbError / checkout when still needed).
 */
export default function LeadIdActivationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const leadId = searchParams?.get("leadId");
    if (!leadId) return;

    try {
      window.localStorage.setItem(LEAD_ID_KEY, leadId);
      const existing = (() => {
        try {
          return JSON.parse(window.localStorage.getItem(LEAD_SESSION_KEY) || "{}");
        } catch {
          return {};
        }
      })();
      window.localStorage.setItem(
        LEAD_SESSION_KEY,
        JSON.stringify({
          ...existing,
          leadId,
          capturedAt: new Date().toISOString(),
          source: existing.source || "dashboard_activation",
        }),
      );
    } catch {
      // non-blocking
    }

    const next = new URLSearchParams(searchParams?.toString() || "");
    next.delete("leadId");
    // Wizard residue — never keep on dashboard
    next.delete("step");
    const qs = next.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }, [searchParams, router]);

  return null;
}
