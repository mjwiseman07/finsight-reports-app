"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bootstrapLeadSessionFromSearchParams } from "@/lib/activation/lead-session";

/**
 * URL cleanup for ?leadId= after bootstrap.
 * Access bootstrap itself must call bootstrapLeadSessionFromSearchParams
 * before the access gate — this handler only strips leadId from the URL
 * once it is present (safe to mount outside authenticated product content).
 */
export default function LeadIdActivationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const leadId = searchParams?.get("leadId");
    if (!leadId) return;

    bootstrapLeadSessionFromSearchParams(searchParams);

    const next = new URLSearchParams(searchParams?.toString() || "");
    next.delete("leadId");
    next.delete("step");
    const qs = next.toString();
    router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }, [searchParams, router]);

  return null;
}
