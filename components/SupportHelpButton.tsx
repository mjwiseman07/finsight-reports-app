"use client";

import Link from "next/link";
import { focusRing } from "@/components/site-ui";

export function SupportHelpButton({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) {
  // compact = light text-only control for the gold dashboard/marketing pill.
  // Default (non-compact) keeps the prior gold outlined treatment for dark surfaces.
  const className = compact
    ? `${focusRing("rounded-lg")} text-sm font-bold text-[#111112] transition hover:text-[#0B1A3A]`
    : "rounded-2xl border border-[#C9A961]/30 bg-[#C9A961]/10 px-5 py-3 text-sm font-semibold text-[#C9A961] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/20";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        Help
      </button>
    );
  }

  return (
    <Link href="/support" className={className}>
      Help
    </Link>
  );
}
