"use client";

import Link from "next/link";

export function SupportHelpButton({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) {
  const className = compact
    ? "rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-slate-100 transition hover:border-[#FF7A1A]/50"
    : "rounded-2xl border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 px-5 py-3 text-sm font-black text-[#FFD0AB] transition hover:border-[#FF7A1A]/60 hover:bg-[#FF7A1A]/20";

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
