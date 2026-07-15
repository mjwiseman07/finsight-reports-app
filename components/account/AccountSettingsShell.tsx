"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { headingFont } from "@/components/site-ui";

const TABS = [
  { id: "profile", label: "Profile", href: "/dashboard/account" },
  { id: "security", label: "Security", href: "/dashboard/account/security" },
  { id: "billing", label: "Billing", href: "/dashboard/account/billing" },
  {
    id: "notifications",
    label: "Notifications",
    href: "/dashboard/account/notifications",
  },
] as const;

export type AccountTabId = (typeof TABS)[number]["id"];

export function AccountSettingsShell({
  activeTab,
  children,
}: {
  activeTab: AccountTabId;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
        Account
      </p>
      <h1
        className={`mt-3 text-3xl font-black tracking-[-0.03em] text-[#111112] ${headingFont}`}
      >
        Account settings
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5C5A55]">
        Manage your Advisacor profile, security, and billing preferences.
      </p>

      <nav className="mt-8" aria-label="Account sections">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#C9A961] p-1.5 shadow-sm">
          {TABS.map((tab) => {
            const isActive =
              activeTab === tab.id ||
              pathname === tab.href ||
              (tab.id === "security" && pathname?.startsWith(tab.href));
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`${headingFont} rounded-full px-5 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[#0B1A3A] font-black text-white shadow-md"
                    : "font-bold text-[#111112] hover:text-[#0B1A3A]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-8 rounded-3xl border border-[#E8E6E0] bg-white p-6 shadow-sm shadow-black/5 sm:p-8">
        {children}
      </div>
    </div>
  );
}
