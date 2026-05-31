import Link from "next/link";
import type { ReactNode } from "react";
import { AdvisacorLogo } from "./AdvisacorLogo";

const navItems = [
  { href: "/client-briefings", label: "Dashboard" },
  { href: "/client-briefings/settings", label: "Settings" },
  { href: "/client-briefings/history", label: "Briefing History" },
  { href: "/client-briefings/preview", label: "Client Preview" },
];

const statusStyles: Record<string, string> = {
  Draft: "border-slate-300/20 bg-slate-300/10 text-slate-200",
  "Pending Approval": "border-amber-300/30 bg-amber-400/10 text-amber-100",
  Approved: "border-blue-300/30 bg-blue-400/10 text-blue-100",
  Sent: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  Failed: "border-red-300/30 bg-red-400/10 text-red-100",
  Skipped: "border-white/10 bg-white/[0.06] text-slate-300",
};

const riskStyles: Record<string, string> = {
  Low: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  Medium: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  High: "border-red-300/30 bg-red-400/10 text-red-100",
};

export function ClientBriefingsChrome({ children, active = "Dashboard" }: { children: ReactNode; active?: string }) {
  return (
    <main className="advisacor-dark-grid min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-4 z-40 rounded-3xl border border-white/10 bg-[#0A1020]/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
              <AdvisacorLogo priority className="w-full" />
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link href="/firm" className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-200">
                Firm Portal
              </Link>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-xs font-black ${
                    active === item.label
                      ? "border-[#FF7A1A]/30 bg-[#FF7A1A]/15 text-[#FFD0AB]"
                      : "border-white/10 bg-white/[0.06] text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyles[status] || statusStyles.Skipped}`}>
      {status}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-black ${riskStyles[risk] || riskStyles.Low}`}>
      {risk}
    </span>
  );
}

export function EmptyBriefingState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-6 text-sm font-bold text-amber-100">
      {message}
    </div>
  );
}
