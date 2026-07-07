import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { focusRing, headingFont, primaryCtaClass } from "@/components/site-ui";

export const metadata: Metadata = {
  title: "What Advisacor Does — AI-powered close, review, and CFO insight",
  description:
    "Advisacor is an AI teammate for accounting teams: draft the close, catch what a second reviewer would catch, deliver CFO-level insight, and prove every number with an immutable audit trail.",
};

const capabilities = [
  {
    eyebrow: "Close the books faster",
    title: "Draft a monthly close in minutes, not days.",
    body:
      "Reconciliation, accrual, and variance agents work alongside your team on the ledgers you already use — QuickBooks Online, Xero, Sage Intacct, NetSuite, and Dynamics. Every entry is reviewable, every source document is attached.",
    bullets: [
      "Automated bank and credit-card reconciliation",
      "Accrual and prepaid schedules with journal-entry drafts",
      "Variance analysis against budget, prior period, and forecast",
    ],
  },
  {
    eyebrow: "Catch what a second reviewer would catch",
    title: "A defensible review layer on every transaction.",
    body:
      "Advisacor scores every bill, journal, and payment against the patterns of your book. Duplicate detection, statistical anomaly, three-way match, and vendor-existence checks run automatically — with a reviewer queue that captures every decision.",
    bullets: [
      "Duplicate bill and payment detection across multiple strategies",
      "Statistical anomaly scoring against your own history",
      "Three-way match on POs, receipts, and vendor invoices",
      "Full reviewer queue with approve, reject, and escalate actions",
    ],
  },
  {
    eyebrow: "Give owners a CFO's brain",
    title: "Plain-English insight, not spreadsheet gymnastics.",
    body:
      "Ask a question. Get an answer with the underlying transaction, ratio, or benchmark attached. Owners see cash, revenue, margin, and compliance in one view — with narratives their team can actually act on.",
    bullets: [
      "Plain-English answers with citations to the source data",
      "Industry-specific KPIs and benchmarks across ten verticals",
      "Board-ready monthly packages generated, not assembled by hand",
    ],
  },
  {
    eyebrow: "Prove every number",
    title: "Audit-ready by default.",
    body:
      "Every event Advisacor produces — every journal, every review, every override — is written to an immutable ledger with a cryptographic chain. Auditors can verify the chain end-to-end. Regulators can see who did what and when.",
    bullets: [
      "Cryptographic Merkle-chained audit trail on every event",
      "SOC 2 aligned, HIPAA-ready, GAAP + IFRS + IFRS for SMEs",
      "One-click export of the full evidence package per period",
    ],
  },
];

export default function WhatItDoesPage() {
  return (
    <main className="min-h-screen bg-[#0A1530] text-white">
      <SiteNav />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-[300px] md:pb-16 md:pt-[380px] lg:pt-[440px]">
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          What Advisacor Does
        </p>
        <h1
          className={`${headingFont} max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl`}
        >
          An AI teammate for the people who actually keep the books.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
          Advisacor drafts your close, reviews your books, delivers CFO-level insight,
          and proves every number with an immutable audit trail — without replacing
          the humans who own the client relationship.
        </p>
      </section>
      {/* Four capability sections */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6">
          {capabilities.map((cap) => (
            <article
              key={cap.eyebrow}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 md:p-10"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]">
                {cap.eyebrow}
              </p>
              <h2
                className={`${headingFont} mt-4 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl`}
              >
                {cap.title}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                {cap.body}
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {cap.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-white/80 md:text-base"
                  >
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[#C9A961]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      {/* Closing CTA */}
      <section className="border-t border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <h2
            className={`${headingFont} max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl`}
          >
            Ready to see it on your own books?
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Bring one month of closed data. We'll show you what Advisacor would have
            caught, drafted, and delivered — before you commit to anything.
          </p>
          <div className="mt-10">
            <Link
              href="/free-review"
              className={`inline-flex items-center justify-center rounded-full px-8 py-4 text-base ${primaryCtaClass} ${focusRing()}`}
            >
              Request Early Access
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
