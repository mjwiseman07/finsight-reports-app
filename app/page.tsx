import { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import PersonaRouter from "@/components/PersonaRouter";
import { headingFont } from "@/components/site-ui";

export const metadata: Metadata = {
  title:
    "Advisacor — AI-powered close, review, and CFO insight for the people who keep the books",
  description:
    "Advisacor gives bookkeepers, firms, and business owners an AI teammate that drafts closes, reviews the books, and surfaces CFO-level insights — without replacing the humans who own the relationship.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-[300px] md:pb-16 md:pt-[380px] lg:pt-[440px]">
        <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] md:text-base">
          Advisacor for accounting teams
        </p>
        <h1
          className={`${headingFont} max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl`}
        >
          The AI teammate for the people who actually keep the books.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#A29E93] md:text-xl">
          Draft a close in minutes. Catch what a second set of eyes would catch.
          Give business owners a CFO&apos;s brain without a CFO&apos;s salary.
          Choose your path below.
        </p>
      </section>
      {/* Persona chooser */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <PersonaRouter />
      </section>
      {/* W1 pilot CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-2xl border border-[#C9A961]/40 bg-[#1A1A1C] p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A961] mb-2">Live now — pilot pricing</p>
            <h3 className={`${headingFont} text-2xl md:text-3xl font-semibold leading-tight`}>
              Solo Bookkeeper pilot is open.
            </h3>
            <p className="mt-3 text-[#A29E93] max-w-2xl">
              First 10 pilot slots — $279/mo flat or $69/client/mo à la carte. QBO only.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-[#C9A961] text-[#111112] font-semibold px-6 py-3 hover:bg-[#DFC084] transition whitespace-nowrap"
          >
            See pricing
          </Link>
        </div>
      </section>
      {/* Trust bar */}
      <section className="border-t border-[#C9A961]/20 bg-[#1A1A1C]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-[#7A7974]">
            Built on the standards you already answer to
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#A29E93]">
            <span>SOC 2 aligned</span>
            <span>·</span>
            <span>HIPAA-ready</span>
            <span>·</span>
            <span>US GAAP + IFRS + ASC 606 / 842 / 946 / 958</span>
            <span>·</span>
            <span>QuickBooks Online + Xero</span>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
