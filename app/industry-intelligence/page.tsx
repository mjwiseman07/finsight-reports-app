"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import {
  benchmarkingFramework,
  buildBenchmarkingPlaceholders,
  buildIndustryExecutiveSummary,
  coreFinancialIntelligence,
  getIndustryIntelligenceModule,
  supportedIndustryTypes,
} from "../../lib/industry-intelligence-framework";

type SampleMetric = {
  label: string;
  value: string;
  trend: string;
};

type MetricGroup = {
  title: string;
  metrics: string[];
};

type BenchmarkPlaceholder = {
  metric: string;
  company: string;
  industryAverage: string;
};

function trendTone(trend: string) {
  if (trend.startsWith("+")) return "text-emerald-200";
  if (trend.startsWith("-")) return "text-red-200";
  return "text-slate-300";
}

export default function IndustryIntelligencePage() {
  const [industryType, setIndustryType] = useState("Manufacturing");
  const module = getIndustryIntelligenceModule(industryType);
  const executiveSummary = buildIndustryExecutiveSummary(industryType);
  const benchmarks = useMemo(() => buildBenchmarkingPlaceholders(industryType), [industryType]);

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/healthcare-intelligence" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200">
              Healthcare Module
            </Link>
            <Link href="/onboarding" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200">
              Industry Onboarding
            </Link>
          </div>
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Phase 12</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Industry-Aware Financial Intelligence.</h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-300">
            Advisacor now resolves Core Financial Intelligence plus an Industry Intelligence Module from `company.industry_type`, so KPIs, dashboards, executive summaries, AI commentary, recommendations, benchmarking, and operational intelligence can adapt to how the company operates.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.32fr_1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Industry Type</p>
            <div className="mt-4 grid gap-2">
              {supportedIndustryTypes.map((industry: string) => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => setIndustryType(industry)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    industryType === industry ? "bg-[#FF7A1A] text-white" : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </aside>

          <section className="grid gap-6">
            <div className="rounded-[2rem] border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">{industryType}</p>
              <h2 className="mt-3 text-3xl font-black">{module.dashboardName}</h2>
              <p className="mt-3 max-w-3xl leading-7 text-slate-300">Focus: {module.focus}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm leading-6 text-slate-300">
                {executiveSummary.summaryFocus}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {module.sampleMetrics.map((metric: SampleMetric) => (
                <div key={metric.label} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-2xl font-black text-white">{metric.value}</p>
                  <p className={`mt-2 text-sm font-black ${trendTone(metric.trend)}`}>{metric.trend}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Industry Dashboard Sections</p>
                <div className="mt-5 grid gap-4">
                  {module.metricGroups.map((group: MetricGroup) => (
                    <div key={group.title} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-sm font-black text-white">{group.title}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {group.metrics.map((metric: string) => (
                          <span key={metric} className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300">
                            {metric}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <Panel title="Core Financial Intelligence">
                  <div className="flex flex-wrap gap-2">
                    {coreFinancialIntelligence.map((item: string) => (
                      <span key={item} className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </Panel>

                <Panel title="AI Commentary Guidance">
                  <div className="grid gap-2">
                    {module.executiveCommentary.map((item: string) => (
                      <p key={item} className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-300">
                        Explain {item}.
                      </p>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-3">
              <Panel title="Recommendations">
                <div className="grid gap-2">
                  {module.recommendations.map((recommendation: string) => (
                    <p key={recommendation} className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-300">
                      {recommendation}
                    </p>
                  ))}
                </div>
              </Panel>

              <Panel title="Benchmarking Framework">
                <p className="text-sm leading-6 text-slate-400">{benchmarkingFramework.purpose}</p>
                <div className="mt-4 grid gap-2">
                  {benchmarks.map((benchmark: BenchmarkPlaceholder) => (
                    <div key={benchmark.metric} className="rounded-2xl bg-slate-950/60 px-4 py-3 text-xs font-bold text-slate-300">
                      {benchmark.metric}: {benchmark.company} vs {benchmark.industryAverage}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Operational Intelligence">
                <div className="flex flex-wrap gap-2">
                  {module.operationalIntelligence.map((item: string) => (
                    <span key={item} className="rounded-full bg-[#FF7A1A]/15 px-3 py-2 text-xs font-black text-[#FFB36F]">
                      {item}
                    </span>
                  ))}
                </div>
              </Panel>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
