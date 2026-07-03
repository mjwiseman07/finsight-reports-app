"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { SiteNav } from "../../../../components/SiteNav";
import { SiteFooter } from "../../../../components/SiteFooter";
import { headingFont, focusRing } from "../../../../components/site-ui";
import { UncategorizedTab } from "./UncategorizedTab";
import { RecurringTab } from "./RecurringTab";

type TabKey = "uncategorized" | "recurring";

const TABS: { key: TabKey; label: string }[] = [
  { key: "uncategorized", label: "Uncategorized" },
  { key: "recurring", label: "Recurring" },
];

export default function UncategorizedAdminPage() {
  const params = useParams();
  const firmClientId = String(params?.firm_client_id ?? "");
  const [tab, setTab] = useState<TabKey>("uncategorized");

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F9FAFB]">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
              D4 / D5 Pilot — Review Queue
            </p>
            <h1 className={`mt-2 text-3xl font-bold text-white ${headingFont}`}>Client Review</h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Client <span className="font-mono text-[#CBD5E1]">{firmClientId}</span>
            </p>
          </div>
          <Link
            href="/admin"
            className={`self-start rounded-xl border border-white/10 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-white/5 ${focusRing}`}
          >
            Back to Admin
          </Link>
        </div>

        <div className="mb-6 flex gap-2 border-b border-[#243041]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${focusRing} ${
                tab === t.key
                  ? "border-[#5B8CFF] text-white"
                  : "border-transparent text-[#94A3B8] hover:text-[#CBD5E1]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "uncategorized" ? (
          <UncategorizedTab firmClientId={firmClientId} />
        ) : (
          <RecurringTab firmClientId={firmClientId} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
