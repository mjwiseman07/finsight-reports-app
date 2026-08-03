"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";
import { QboOnlyBadge } from "@/components/QboOnlyBadge";
import { PricingCard, type BillingInterval } from "@/components/pricing/PricingToggles";
import { supabase } from "@/lib/supabase";
import { buildPricingSignupUrl } from "@/lib/pricing/checkout-handlers";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />

      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-20 lg:pt-24 pb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          Review Assist — pilot pricing
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight max-w-4xl`}
        >
          Start read-only. Move to full close review when you&apos;re ready.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-[#A29E93] max-w-2xl leading-relaxed">
          Both tiers connect to QuickBooks Online today.{" "}
          <span className="block mt-2 text-[#7A7974]">
            Xero support —{" "}
            <Link href="/coming-soon" className="underline underline-offset-2">
              Phase X, launching August
            </Link>
            .
          </span>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReviewAssistCard />
        <ReviewAssistProCard />
      </section>

      <ForceFirmCallout />

      <EnterpriseEngagementSection />

      <SiteFooter />
    </main>
  );
}

/* ----------------------------------------------------------------
 * Review Assist ($99/mo)
 * ---------------------------------------------------------------- */
function ReviewAssistCard() {
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("yearly");

  async function handleStart() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      window.location.href = buildPricingSignupUrl({
        plan: "review_assist",
        cadence: interval,
        track: "standard",
        isAuthenticated: Boolean(user),
      });
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#C9A961]/40 bg-[#1A1A1C] p-6 flex flex-col">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-[#C9A961] mb-1">
          Live now
        </p>
        <h2 className={`${headingFont} text-2xl font-semibold`}>
          Review Assist
        </h2>
        <p className="text-sm text-[#A29E93] mt-1">
          Read-only close review — start here to see how Advisacor thinks about your books
        </p>
      </div>

      <QboOnlyBadge />

      <PricingCard
        productName="Review Assist"
        ratePlan="standard"
        onIntervalChange={setInterval}
        bounds={{
          base_included: 1,
          overage_step: 1,
          overage_price_monthly_cents: 0, // RA is single-entity, no overage
          unit_label: "company",
          unit_label_plural: "companies",
          min: 1,
          max: 1,
        }}
        monthlyStandardCents={9900}
        monthlyPilotCents={9900}
        yearlyStandardCents={99000}
        yearlyPilotCents={99000}
      />

      <ul className="text-sm text-[#A29E93] space-y-2 mb-6 flex-1">
        <li>9-source findings feed per close period</li>
        <li>Variance, anomalies, cutoff, reconciliation, duplicates</li>
        <li>Coverage badge across 8 audit assertions</li>
        <li>Read-only — no write-back to QBO</li>
      </ul>

      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className={`w-full text-center rounded-lg bg-[#C9A961] text-[#111112] font-semibold py-3 ${focusRing()} hover:bg-[#DFC084] transition disabled:opacity-60`}
      >
        {loading ? "Loading…" : "Start Review Assist"}
      </button>
      <p className="mt-3 text-xs text-[#7A7974] text-center">Cancel anytime</p>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Review Assist Pro ($199/mo)
 * ---------------------------------------------------------------- */
function ReviewAssistProCard() {
  const [loading, setLoading] = useState(false);
  const [ratePlan, setRatePlan] = useState<"pilot" | "standard">("pilot");
  const [interval, setInterval] = useState<BillingInterval>("yearly");

  async function handleStartPro() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      window.location.href = buildPricingSignupUrl({
        plan: "review_assist_pro",
        cadence: interval,
        track: ratePlan,
        isAuthenticated: Boolean(user),
      });
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-[#C9A961] bg-[#1A1A1C] p-6 flex flex-col relative">
      <div className="absolute -top-3 right-6 rounded-full bg-[#C9A961] px-3 py-1 text-xs font-semibold text-[#111112]">
        Most popular
      </div>

      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-[#C9A961] mb-1">
          Live now — pilot pricing
        </p>
        <h2 className={`${headingFont} text-2xl font-semibold`}>
          Review Assist Pro
        </h2>
        <p className="text-sm text-[#A29E93] mt-1">
          Bookkeeping firms and controllers — patented memory substrate, direct QBO write, and Ask Pulse
        </p>
      </div>

      <QboOnlyBadge />

      {/* Pilot / Standard rate plan */}
      <div className="mt-4 mb-2 rounded-lg bg-[#1A1A1C]/40 p-1 flex text-xs font-medium">
        <button
          type="button"
          onClick={() => setRatePlan("pilot")}
          className={`flex-1 rounded-md py-2 ${focusRing()} transition ${
            ratePlan === "pilot"
              ? "bg-[#C9A961] text-[#111112]"
              : "text-[#A29E93]"
          }`}
          aria-pressed={ratePlan === "pilot"}
        >
          Pilot rate
        </button>
        <button
          type="button"
          onClick={() => setRatePlan("standard")}
          className={`flex-1 rounded-md py-2 ${focusRing()} transition ${
            ratePlan === "standard"
              ? "bg-[#C9A961] text-[#111112]"
              : "text-[#A29E93]"
          }`}
          aria-pressed={ratePlan === "standard"}
        >
          Standard
        </button>
      </div>

      <PricingCard
        productName="Review Assist Pro"
        ratePlan={ratePlan}
        onIntervalChange={setInterval}
        bounds={{
          base_included: 2,
          overage_step: 1,
          overage_price_monthly_cents: 0, // overage handled via Audit Ready upsell, not per-entity metering
          unit_label: "client",
          unit_label_plural: "clients",
          min: 1,
          max: 2,
        }}
        monthlyStandardCents={19900}
        monthlyPilotCents={13900}
        yearlyStandardCents={199000}
        yearlyPilotCents={139000}
      />

      <ul className="text-sm text-[#A29E93] space-y-2 mb-6 flex-1">
        <li>Everything in Review Assist, plus:</li>
        <li>Direct QuickBooks write-back for journal entries</li>
        <li>AI-reasoned matching with patented memory substrate</li>
        <li>24-month historical cleanup + prior-period lookup</li>
        <li>Ask Pulse Command Center + industry templates (15 verticals)</li>
        <li>Evidence-linked JE proposals with assertion coverage</li>
        <li>Firm variant with 5 seats included</li>
      </ul>

      <button
        type="button"
        onClick={handleStartPro}
        disabled={loading}
        className={`w-full text-center rounded-lg bg-[#C9A961] text-[#111112] font-semibold py-3 ${focusRing()} hover:bg-[#DFC084] transition disabled:opacity-60`}
      >
        {loading ? "Loading…" : "Start Review Assist Pro"}
      </button>
      <p className="mt-3 text-xs text-[#7A7974] text-center">
        Cancel anytime · pilot pricing locks for first 12 months
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Force-Firm callout (30-client threshold)
 * ---------------------------------------------------------------- */
function ForceFirmCallout() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-12">
      <div className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/40 px-5 py-4 text-sm text-[#A29E93]">
        <span className="font-medium text-[#ECEBE7]">Managing 30+ QBO clients?</span>{" "}
        Review Assist Pro auto-elevates to the Firm variant. Same $199/mo — additional seats, portfolio workspace,
        and firm-level dashboards included automatically.
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------
 * Enterprise Engagement (Audit Ready Complex + Multi-entity)
 * ---------------------------------------------------------------- */
function EnterpriseEngagementSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-3">
          Enterprise engagements
        </p>
        <h2 className={`${headingFont} text-2xl md:text-3xl font-semibold`}>
          Audit Ready add-ons for larger scope
        </h2>
        <p className="mt-3 text-sm text-[#A29E93] max-w-2xl">
          Audit Ready attaches to any active Review Assist Pro subscription. Choose the tier
          matching your engagement scope — Complex or Multi-entity — and Advisacor prepares
          the full PBC list, evidence bundles, and assertion coverage automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EnterpriseCard
          title="Audit Ready — Complex"
          scope="Up to 5 entities · Up to 400 PBC requests · 10 auditor users"
          monthlyPrice="$399/mo"
          yearlyPrice="$3,990/yr"
          pilotPrice="$279/mo pilot rate"
          perEngagement="$1,499 per engagement"
          highlights={[
            "Auto-generated PBC list from 500+ standard requests",
            "Tie-out engine with variance/anomaly/cutoff coverage",
            "Auditor portal with request/response threading",
            "90-day prep window · 180-day hard timeout",
          ]}
        />
        <EnterpriseCard
          title="Audit Ready — Multi-entity"
          scope="Unlimited entities · Unlimited PBC requests · 25 auditor users"
          monthlyPrice="$699/mo"
          yearlyPrice="$6,990/yr"
          pilotPrice="$489/mo pilot rate"
          perEngagement="$2,499 per engagement"
          highlights={[
            "Everything in Complex, plus multi-entity consolidation",
            "Cross-entity variance analysis + eliminations",
            "Consolidated auditor workspace across all entities",
            "Priority Slack channel + dedicated Advisacor advisor",
          ]}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/40 px-5 py-4 text-sm text-[#A29E93]">
        <span className="font-medium text-[#ECEBE7]">Requires active Review Assist Pro.</span>{" "}
        Both add-ons attach to your existing RA Pro subscription — one Audit Ready engagement
        per company subscription, unlimited concurrent engagements on the Firm variant.
      </div>
    </section>
  );
}

function EnterpriseCard(props: {
  title: string;
  scope: string;
  monthlyPrice: string;
  yearlyPrice: string;
  pilotPrice: string;
  perEngagement: string;
  highlights: string[];
}) {
  // /contact does not exist yet — mailto fallback per Track 4.5 Block A paste.
  return (
    <a
      href={`mailto:sales@advisacor.com?subject=${encodeURIComponent(`${props.title} — Advisacor inquiry`)}`}
      className={`rounded-2xl border border-[#C9A961]/40 bg-[#1A1A1C] p-6 flex flex-col ${focusRing()} hover:border-[#C9A961]/80 transition`}
    >
      <h3 className={`${headingFont} text-xl font-semibold text-[#ECEBE7]`}>
        {props.title}
      </h3>
      <p className="mt-1 text-xs text-[#7A7974]">{props.scope}</p>

      <div className="mt-4 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`${headingFont} text-2xl font-semibold`}>{props.monthlyPrice}</span>
          <span className="text-xs text-[#7A7974]">or {props.yearlyPrice}</span>
        </div>
        <div className="text-xs text-[#C9A961]">{props.pilotPrice}</div>
        <div className="text-xs text-[#A29E93]">or {props.perEngagement}</div>
      </div>

      <ul className="mt-5 text-sm text-[#A29E93] space-y-2 flex-1">
        {props.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>

      <div className="mt-6 text-sm font-semibold text-[#C9A961]">Talk to us →</div>
    </a>
  );
}
