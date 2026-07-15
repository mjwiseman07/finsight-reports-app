import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { focusRing, headingFont, primaryCtaClass } from "@/components/site-ui";

export const metadata: Metadata = {
  title: "How Advisacor Works — Connect, baseline, run, approve",
  description:
    "Four steps: connect your ledgers and feeds, baseline your book, run AI teammates on your cadence, and approve every entry with a full audit trail.",
};

const steps = [
  {
    n: "01",
    title: "Connect",
    body:
      "Advisacor plugs into the tools you already use — QuickBooks Online, Xero, Sage Intacct, NetSuite, and Dynamics — plus bank feeds, credit-card feeds, and your AP inbox. Setup is measured in hours, not weeks.",
  },
  {
    n: "02",
    title: "Baseline",
    body:
      "The onboarding harvest reads your last twelve months to learn your vendor master, chart of accounts, approval thresholds, industry rules, and normal transaction patterns. Nothing is thrown away; nothing is overwritten.",
  },
  {
    n: "03",
    title: "Run",
    body:
      "AI teammates work on the cadence you set — daily, weekly, or at close. They draft reconciliations, review bills, score risk, prepare accruals, and generate the monthly package. You stay in control; they do the volume.",
  },
  {
    n: "04",
    title: "Approve",
    body:
      "Everything lands in a reviewer queue with source documents attached. Approve, reject, escalate, or override — every action is written to an immutable cryptographic ledger that auditors can verify end-to-end.",
  },
];

const trustLayers = [
  { badge: "LIVE", code: "L1", title: "Vendor Existence & Fuzzy Match" },
  { badge: "LIVE", code: "L3", title: "Three-Way Match (PO · Receipt · Bill)" },
  { badge: "LIVE", code: "L4", title: "Visual Fingerprint" },
  { badge: "LIVE", code: "L5", title: "Multi-Strategy Duplicate Detection" },
  { badge: "LIVE", code: "L6", title: "Statistical Anomaly Scoring" },
  { badge: "LIVE", code: "L11", title: "Fraud Score Aggregation" },
  { badge: "LIVE", code: "L12", title: "Immutable Merkle Ledger" },
  { badge: "SOON", code: "L0", title: "Requisitions & Approval Routing" },
  { badge: "SOON", code: "L0.5", title: "Onboarding Baseline Harvest" },
  { badge: "SOON", code: "L7", title: "Credits & Prepayment Netting" },
  { badge: "SOON", code: "L8", title: "Multimodal AP Inbox" },
  { badge: "SOON", code: "L9", title: "Interlock & Segregation of Duties" },
  { badge: "SOON", code: "L10", title: "Banking Rail Fan-Out" },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 md:pb-16 md:pt-20 lg:pt-24">
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          How Advisacor Works
        </p>
        <h1
          className={`${headingFont} max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl`}
        >
          Four steps from your ledger to a defensible close.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#A29E93] md:text-xl">
          Advisacor is engineered to fit the way accounting actually happens —
          connect the systems you use, baseline how your book behaves, run AI teammates
          on your cadence, and approve every entry through a reviewer queue that leaves
          a cryptographic audit trail behind.
        </p>
      </section>
      {/* Four-step workflow */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {steps.map((s) => (
            <article
              key={s.n}
              className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-8"
            >
              <p className={`${headingFont} text-6xl font-semibold text-[#C9A961]`}>
                {s.n}
              </p>
              <h2
                className={`${headingFont} mt-6 text-2xl font-semibold leading-tight tracking-tight md:text-3xl`}
              >
                {s.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#A29E93] md:text-lg">
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </section>
      {/* Under the hood — 13-layer trust stack */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]/40">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#7A7974]">
            Under the hood
          </p>
          <h2
            className={`${headingFont} max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl`}
          >
            A thirteen-layer trust stack — most of it already running.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#A29E93] md:text-lg">
            Every bill, journal, and payment passes through the layers below. Each layer
            is patent-pending, independently testable, and produces its own audit
            evidence. Layers marked <span className="font-semibold text-[#C9A961]">LIVE</span> are shipping today; layers marked <span className="font-semibold text-[#A29E93]">SOON</span> are on the near-term roadmap.
          </p>
          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustLayers.map((l) => (
              <li
                key={l.code}
                className="flex items-center gap-4 rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 px-5 py-4"
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                    l.badge === "LIVE"
                      ? "bg-[#C9A961] text-[#111112]"
                      : "border border-[#C9A961]/30 text-[#7A7974]"
                  }`}
                >
                  {l.badge}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">
                    {l.code}
                  </p>
                  <p className="text-sm font-semibold text-[#ECEBE7] md:text-base">
                    {l.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <h2
          className={`${headingFont} max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl`}
        >
          Curious what step two would surface on your book?
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#A29E93]">
          Bring one closed month. We'll baseline it, run the trust stack against it,
          and show you the findings — no commitment.
        </p>
        <div className="mt-10">
          <Link
            href="/free-review"
            className={`inline-flex items-center justify-center rounded-full px-8 py-4 text-base ${primaryCtaClass} ${focusRing()}`}
          >
            Request Early Access
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
