"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [homeCurrency, setHomeCurrency] = useState<string | undefined>(undefined);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("supabase_access_token") || "";
  }, []);

  // Phase MC-2d.2 — prefetch home_currency once from the proposals endpoint
  // so the first tab render already has the tenant's currency in hand. The
  // per-tab fetches will also thread home_currency through, but this ensures
  // the tab that mounts first doesn't briefly flash USD before its fetch
  // returns.
  const loadHomeCurrency = useCallback(async () => {
    if (!firmClientId || !token) return;
    try {
      const res = await fetch(
        `/api/uncategorized/proposals?firm_client_id=${encodeURIComponent(firmClientId)}&status=pending&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { home_currency?: string };
      if (json.home_currency) setHomeCurrency(json.home_currency);
    } catch {
      // Non-fatal — tab-level fetches will retry.
    }
  }, [firmClientId, token]);

  useEffect(() => {
    void loadHomeCurrency();
  }, [loadHomeCurrency]);

  return (
    <div className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.2em] text-[#C9A961] ${headingFont}`}>
              D4 / D5 Pilot — Review Queue
            </p>
            <h1 className={`mt-2 text-3xl font-black text-[#ECEBE7] ${headingFont}`}>Client Review</h1>
            <p className="mt-2 text-sm text-[#A29E93]">
              Client <span className="font-mono text-[#ECEBE7]">{firmClientId}</span>
            </p>
          </div>
          <Link
            href="/admin"
            className={`self-start rounded-full border border-[#C9A961]/20 px-4 py-2 text-sm text-[#ECEBE7] hover:bg-[#C9A961]/10 ${focusRing()}`}
          >
            Back to Admin
          </Link>
        </div>

        <div className="mb-6 flex gap-2 border-b border-[#C9A961]/20">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${focusRing()} ${
                tab === t.key
                  ? `border-[#C9A961] text-[#ECEBE7] ${headingFont}`
                  : "border-transparent text-[#A29E93] hover:text-[#ECEBE7]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "uncategorized" ? (
          <UncategorizedTab
            firmClientId={firmClientId}
            homeCurrency={homeCurrency}
            onHomeCurrencyResolved={setHomeCurrency}
          />
        ) : (
          <RecurringTab
            firmClientId={firmClientId}
            homeCurrency={homeCurrency}
            onHomeCurrencyResolved={setHomeCurrency}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
