"use client";

import Link from "next/link";

export function SupportHelpButton({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) {
  const className = compact
    ? "rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-[#C9A961]/50"
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
