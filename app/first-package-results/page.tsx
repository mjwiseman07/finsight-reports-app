"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";

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
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
            First Package Ready
          </div>
        </header>

        <section className="mt-8 rounded-[2rem] border border-emerald-300/25 bg-emerald-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Your first Advisacor package is ready</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">{companyName}</h1>
          <p className="mt-4 max-w-3xl leading-8 text-slate-300">
            Advisacor connected your data source, analyzed the financials, built an executive summary, and prepared your first {packageLabel(packageLevel)} package with {industryType} context.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {[
            ["Executive Summary", "Plain-English highlights, key risks, opportunities, and management focus areas."],
            ["PDF Package", "A polished financial package ready for review and sharing."],
            ["PowerPoint Package", "Board-ready slides for executive discussion."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-lg font-black text-white">{title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Next best actions</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
              View Dashboard
            </Link>
            <Link href="/industry-intelligence" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
              Review Industry Intelligence
            </Link>
            <Link href="/healthcare-intelligence" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
              View Healthcare Module
            </Link>
            <Link href="/dashboard#owner-delivery-settings" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
              Configure Weekly Brief
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function FirstPackageResultsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0A1020] p-6 text-white">Loading first package results...</main>}>
      <FirstPackageResultsContent />
    </Suspense>
  );
}
