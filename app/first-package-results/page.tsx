"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, primaryCtaClass } from "@/components/site-ui";

function packageLabel(packageLevel: string) {
  if (packageLevel === "virtual-cfo") return "Virtual CFO";
  if (packageLevel === "professional") return "Professional";
  return "Essential";
}

function FirstPackageResultsContent() {
  const searchParams = useSearchParams();
  const companyName = searchParams?.get("companyName") || "Your company";
  const industryType = searchParams?.get("industryType") || "Industry Intelligence";
  const packageLevel = searchParams?.get("packageLevel") || "essential";

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>
            Your first Advisacor package is ready
          </p>
          <div className={`${headingFont} rounded-full border border-[#6DAA45]/40 bg-[#6DAA45]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#B5E28A]`}>
            First Package Ready
          </div>
        </div>

        <section className="mt-6 rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className={`${headingFont} text-4xl font-black tracking-[-0.04em] text-white md:text-5xl`}>
            {companyName}
          </h1>
          <p className="mt-4 max-w-3xl leading-8 text-[#A29E93]">
            Advisacor connected your data source, analyzed the financials, built an executive summary, and prepared your first {packageLabel(packageLevel)} package with {industryType} context.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {[
            ["Executive Summary", "Plain-English highlights, key risks, opportunities, and management focus areas."],
            ["PDF Package", "A polished financial package ready for review and sharing."],
            ["PowerPoint Package", "Board-ready slides for executive discussion."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/70 p-6">
              <p className={`${headingFont} text-lg font-black text-white`}>{title}</p>
              <p className="mt-3 text-sm leading-6 text-[#A29E93]">{description}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#C9A961]/20 bg-[#111112] p-6">
          <p className={`${headingFont} text-sm font-black uppercase tracking-[0.18em] text-[#A29E93]`}>
            Next best actions
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard" className={primaryCtaClass}>
              View Dashboard
            </Link>
            <Link
              href="/industry-intelligence"
              className={`${headingFont} rounded-full border border-[#C9A961]/30 bg-transparent px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10`}
            >
              Review Industry Intelligence
            </Link>
            <Link
              href="/healthcare-intelligence"
              className={`${headingFont} rounded-full border border-[#C9A961]/30 bg-transparent px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10`}
            >
              View Healthcare Module
            </Link>
            <Link
              href="/dashboard#owner-delivery-settings"
              className={`${headingFont} rounded-full border border-[#C9A961]/30 bg-transparent px-5 py-3 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10`}
            >
              Configure Weekly Brief
            </Link>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

export default function FirstPackageResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#111112] p-6 text-[#ECEBE7]">
          Loading first package results...
        </main>
      }
    >
      <FirstPackageResultsContent />
    </Suspense>
  );
}
