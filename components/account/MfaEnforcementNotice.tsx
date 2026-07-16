"use client";

import Link from "next/link";
import { focusRing } from "@/components/site-ui";

export function MfaEnforcementNotice({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-3xl border border-[#F0C88B] bg-[#FDF3E7] px-5 py-4 text-sm text-[#8A4A15]"
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8A4A15]">
        Required
      </p>
      <p className="mt-2 text-base font-black text-[#8A4A15]">
        Two-factor authentication is required for firm administrators.
      </p>
      <p className="mt-2 text-sm leading-6 text-[#8A4A15]/85">
        Enroll now to restore access to admin, billing, and QuickBooks connection
        management surfaces.
      </p>
      <Link
        href="/dashboard/account/security?enforcement=required"
        className={`mt-4 inline-flex items-center justify-center rounded-full bg-[#0B1A3A] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] ${focusRing("rounded-full")}`}
      >
        Enable now
      </Link>
    </div>
  );
}
