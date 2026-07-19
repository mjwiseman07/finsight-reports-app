"use client";

import Link from "next/link";
import { focusRing, primaryCtaClass } from "@/components/site-ui";

export function MfaEnforcementNotice({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <p className="font-semibold">
        Two-factor authentication is required for firm administrators.
      </p>
      <p className="mt-1 text-red-800/90">
        Enroll now to restore access to admin, billing, and QuickBooks connection
        management surfaces.
      </p>
      <Link
        href="/dashboard/account/security?enforcement=required"
        className={`mt-3 inline-flex rounded-md px-4 py-2 text-sm ${primaryCtaClass} ${focusRing()}`}
      >
        Enable now
      </Link>
    </div>
  );
}
