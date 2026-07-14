import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";
import { headingFont } from "@/components/site-ui";

const navItems = [
  { href: "/client-briefings", label: "Dashboard" },
  { href: "/client-briefings/settings", label: "Settings" },
  { href: "/client-briefings/history", label: "Briefing History" },
  { href: "/client-briefings/preview", label: "Client Preview" },
];

const statusStyles: Record<string, string> = {
  Draft: "border-[#C9A961]/25 bg-[#C9A961]/10 text-[#ECEBE7]",
  "Pending Approval": "border-amber-300/40 bg-amber-400/10 text-amber-100",
  Approved: "border-[#5591C7]/40 bg-[#5591C7]/10 text-[#B7D6F0]",
  Sent: "border-[#6DAA45]/40 bg-[#6DAA45]/10 text-[#B5E28A]",
  Failed: "border-[#B85C5C]/40 bg-[#B85C5C]/10 text-[#F0BFBF]",
  Skipped: "border-[#C9A961]/20 bg-[#1A1A1C] text-[#A29E93]",
};

const riskStyles: Record<string, string> = {
  Low: "border-[#6DAA45]/40 bg-[#6DAA45]/10 text-[#B5E28A]",
  Medium: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  High: "border-[#B85C5C]/40 bg-[#B85C5C]/10 text-[#F0BFBF]",
};

export function ClientBriefingsChrome({ children, active = "Dashboard" }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="sticky top-4 z-30 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/firm" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black text-[#ECEBE7] hover:border-[#C9A961]/50">
                Firm Portal
              </Link>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition-colors ${
                    active === item.label
                      ? "border-[#C9A961]/60 bg-[#C9A961]/15 text-[#DFC084]"
                      : "border-[#C9A961]/20 bg-[#1A1A1C] text-[#A29E93] hover:border-[#C9A961]/40 hover:text-[#ECEBE7]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className={headingFont}>{children}</div>
        </div>
      </main>
    </div>
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
    <div className="rounded-3xl border border-[#C9A961]/25 bg-[#1A1A1C] p-6 text-sm font-bold text-[#A29E93]">
      {message}
    </div>
  );
}
