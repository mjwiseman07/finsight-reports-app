import { Metadata } from "next";
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
    <main className="min-h-screen bg-[#0B0B0C] text-white">
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
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
          Draft a close in minutes. Catch what a second set of eyes would catch.
          Give business owners a CFO&apos;s brain without a CFO&apos;s salary.
          Choose your path below.
        </p>
      </section>
      {/* Persona chooser */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <PersonaRouter />
      </section>
      {/* Trust bar */}
      <section className="border-t border-white/10 bg-[#0F0F10]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-white/50">
            Built on the standards you already answer to
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
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
