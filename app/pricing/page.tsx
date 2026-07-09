"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";
import { QboOnlyBadge } from "@/components/QboOnlyBadge";
import { WaitlistCapture } from "@/components/WaitlistCapture";

type SoloBkMode = "flat" | "per_client";

export default function PricingPage() {
  const [soloMode, setSoloMode] = useState<SoloBkMode>("flat");

  return (
    <main className="min-h-screen bg-[#0A1530] text-white">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-6 pt-[200px] md:pt-[240px] pb-16">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          Pricing — Phase 1 pilot
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          Start with the pilot. Convert when you&apos;re ready.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          One SKU live this week. The rest launch weekly. All connect to QuickBooks Online today.
          <span className="block mt-2 text-white/50">
            Xero support —{" "}
            <Link href="/coming-soon" className="underline underline-offset-2">
              Phase X, launching August
            </Link>
            .
          </span>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-[#C9A961]/40 bg-[#0F1D3E] p-6 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#C9A961] mb-1">Live now</p>
              <h2 className={`${headingFont} text-2xl font-semibold`}>Solo Bookkeeper</h2>
              <p className="text-sm text-white/60 mt-1">
                Independent bookkeeper — up to 10 QBO clients
              </p>
            </div>
          </div>

          <QboOnlyBadge />

          <div className="mt-4 mb-4 rounded-lg bg-black/20 p-1 flex text-xs font-medium">
            <button
              onClick={() => setSoloMode("flat")}
              className={`flex-1 rounded-md py-2 ${focusRing()} ${soloMode === "flat" ? "bg-[#C9A961] text-[#0A1530]" : "text-white/60"}`}
              aria-pressed={soloMode === "flat"}
            >
              Flat
            </button>
            <button
              onClick={() => setSoloMode("per_client")}
              className={`flex-1 rounded-md py-2 ${focusRing()} ${soloMode === "per_client" ? "bg-[#C9A961] text-[#0A1530]" : "text-white/60"}`}
              aria-pressed={soloMode === "per_client"}
            >
              Per-client
            </button>
          </div>

          {soloMode === "flat" ? (
            <>
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`${headingFont} text-3xl font-semibold`}>$399</span>
                  <span className="text-sm text-white/50">/mo standard</span>
                </div>
                <div className="mt-1 text-sm text-[#C9A961]">$279/mo — first 10 pilot slots</div>
                <div className="mt-1 text-xs text-white/50">
                  Annual: $3,830/yr standard · $2,681/yr pilot
                </div>
              </div>
              <ul className="text-sm text-white/70 space-y-2 mb-6 flex-1">
                <li>Up to 10 QBO client engagements</li>
                <li>Full Pulse Intelligence + weekly briefings per client</li>
                <li>Organizational memory across every client</li>
                <li>Predictive alerts + disclosure prep</li>
                <li>All 15 industry verticals</li>
              </ul>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className={`${headingFont} text-3xl font-semibold`}>$99</span>
                  <span className="text-sm text-white/50">/client/mo standard</span>
                </div>
                <div className="mt-1 text-sm text-[#C9A961]">$69/client/mo — first 10 pilot slots</div>
                <div className="mt-1 text-xs text-white/50">
                  Metered — pay only for active clients each month.
                </div>
              </div>
              <ul className="text-sm text-white/70 space-y-2 mb-6 flex-1">
                <li>Same full feature set as flat</li>
                <li>Grow one client at a time — no annual commitment</li>
                <li>Cancel individual clients without cancelling the plan</li>
              </ul>
            </>
          )}

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Launching soon"
            className={`w-full text-center rounded-lg bg-[#C9A961] text-[#0A1530] font-semibold py-3 opacity-60 cursor-not-allowed ${focusRing()}`}
          >
            Start pilot
          </button>
          <p className="mt-3 text-xs text-white/55 text-center">
            Launching soon — join the waitlist below.
          </p>
          <div className="mt-4">
            <WaitlistCapture skuKey="solo_bookkeeper" />
          </div>
        </div>

        <ComingSoonCard
          skuKey="owner_pro"
          title="Owner Pro"
          persona="Business owner — $2M–$10M revenue, multi-entity"
          launchWeek="Week 2 — Jul 15"
        />
        <ComingSoonCard
          skuKey="accounting_pro"
          title="Accounting Pro"
          persona="Controller or CFO reaching in-house for their own books"
          launchWeek="Week 3 — Jul 22"
        />
        <ComingSoonCard
          skuKey="enterprise_firm"
          title="Enterprise Firm"
          persona="Multi-partner firm — 25+ clients"
          launchWeek="Week 4 — Jul 29"
        />
      </section>

      <SiteFooter />
    </main>
  );
}

function ComingSoonCard(props: {
  skuKey: string;
  title: string;
  persona: string;
  launchWeek: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col opacity-70">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-1">{props.launchWeek}</p>
        <h2 className={`${headingFont} text-2xl font-semibold text-white/80`}>{props.title}</h2>
        <p className="text-sm text-white/50 mt-1">{props.persona}</p>
      </div>

      <QboOnlyBadge muted />

      <div className="mt-4 mb-6 flex-1">
        <p className="text-sm text-white/50">
          Launching {props.launchWeek.replace("Week ", "in W").split(" — ")[1]}. Drop your email —
          we&apos;ll notify you the day it goes live.
        </p>
      </div>

      <WaitlistCapture skuKey={props.skuKey} />
    </div>
  );
}
