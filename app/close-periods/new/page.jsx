"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";

function monthRange(month) {
  // month is "YYYY-MM"; returns { start: "YYYY-MM-01", end: "YYYY-MM-<lastDay>" }
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map((n) => parseInt(n, 10));
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function NewClosePeriodContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams?.get("firmClientId") ?? "";

  const [clients, setClients] = useState([]);
  const [firmClientId, setFirmClientId] = useState(preselectedId);
  const [month, setMonth] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClients() {
      setIsLoading(true);
      setError("");
      try {
        const token = window.localStorage.getItem("supabase_access_token") || "";
        const res = await fetch("/api/firm/clients", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Unable to load clients.");
        } else {
          setClients(Array.isArray(data.clients) ? data.clients : []);
        }
      } catch {
        setError("Unable to load clients.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadClients();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const range = monthRange(month);
    if (!firmClientId) {
      setError("Select a client.");
      return;
    }
    if (!range) {
      setError("Select a close month.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/close-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmClientId,
          periodStart: range.start,
          periodEnd: range.end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create close period.");
        return;
      }
      router.push(`/close-periods/${data.closePeriod.id}/checklist`);
    } catch {
      setError("Could not create close period.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          Close ledger
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight`}
        >
          Start a close.
        </h1>
        <p className="mt-4 text-white/70 leading-relaxed">
          Pick a client and the month you&apos;re closing. We&apos;ll create the
          close period and take you to its pre-flight checklist.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-2xl border border-white/10 bg-[#111112] p-8 space-y-6"
        >
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Client
            </label>
            <select
              value={firmClientId}
              onChange={(e) => setFirmClientId(e.target.value)}
              disabled={isLoading}
              className={`w-full rounded-lg border border-white/15 bg-[#0B0B0C] px-4 py-3 text-white ${focusRing()}`}
            >
              <option value="" disabled>
                {isLoading ? "Loading clients…" : "Select a client"}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Close month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`w-full rounded-lg border border-white/15 bg-[#0B0B0C] px-4 py-3 text-white ${focusRing()}`}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#0B0B0C] hover:bg-[#D4B672] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${focusRing()}`}
          >
            {isSubmitting ? "Creating…" : "Create close period"}
            {!isSubmitting && <span aria-hidden>→</span>}
          </button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}

export default function NewClosePeriodPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0B0C] text-white px-6 py-10">
          <p className="text-sm text-white/55">Loading…</p>
        </div>
      }
    >
      <NewClosePeriodContent />
    </Suspense>
  );
}
