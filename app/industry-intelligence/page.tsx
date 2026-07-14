"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";
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
  if (trend.startsWith("+")) return "text-[#B5E28A]";
  if (trend.startsWith("-")) return "text-[#F0BFBF]";
  return "text-[#A29E93]";
}

export default function IndustryIntelligencePage() {
  const [industryType, setIndustryType] = useState("Manufacturing");
  const module = getIndustryIntelligenceModule(industryType);
  const executiveSummary = buildIndustryExecutiveSummary(industryType);
  const benchmarks = useMemo(() => buildBenchmarkingPlaceholders(industryType), [industryType]);

  return (
    <div className={`min-h-screen bg-[#111112] text-[#ECEBE7] ${headingFont}`}>
      <SiteNav />

      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 rounded-3xl border border-[#C9A961]/25 bg-[#1A1A1C]/85 px-5 py-4 shadow-2xl shadow-black/40 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Vertical Intelligence</p>
              <p className="mt-1 text-lg font-black text-[#ECEBE7]">Industry Framework</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/healthcare-intelligence" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ECEBE7] hover:border-[#C9A961]/50">
                Healthcare Module
              </Link>
              <Link href="/onboarding" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ECEBE7] hover:border-[#C9A961]/50">
                Industry Onboarding
              </Link>
            </div>
          </header>

          <section className="mt-8 rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-8 shadow-2xl shadow-black/40">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Phase 12</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#ECEBE7] md:text-5xl">Industry-Aware Financial Intelligence.</h1>
            <p className="mt-3 max-w-4xl leading-7 text-[#A29E93]">
              Advisacor now resolves Core Financial Intelligence plus an Industry Intelligence Module from <code className="rounded bg-[#111112] px-1.5 py-0.5 text-[#DFC084]">company.industry_type</code>, so KPIs, dashboards, executive summaries, AI commentary, recommendations, benchmarking, and operational intelligence can adapt to how the company operates.
            </p>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.32fr_1fr]">
            <aside className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Industry Type</p>
              <div className="mt-4 grid gap-2">
                {supportedIndustryTypes.map((industry: string) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => setIndustryType(industry)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                      industryType === industry
                        ? "bg-[#C9A961] text-[#111112]"
                        : "border border-[#C9A961]/20 bg-[#111112] text-[#A29E93] hover:border-[#C9A961]/40 hover:text-[#ECEBE7]"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </aside>

            <section className="grid gap-6">
              <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#C9A961]/10 p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">{industryType}</p>
                <h2 className="mt-3 text-3xl font-black text-[#ECEBE7]">{module.dashboardName}</h2>
                <p className="mt-3 max-w-3xl leading-7 text-[#A29E93]">Focus: {module.focus}</p>
                <p className="mt-4 rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm leading-6 text-[#ECEBE7]">
                  {executiveSummary.summaryFocus}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {module.sampleMetrics.map((metric: SampleMetric) => (
                  <div key={metric.label} className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7A7974]">{metric.label}</p>
                    <p className="mt-3 text-2xl font-black text-[#DFC084]">{metric.value}</p>
                    <p className={`mt-2 text-sm font-black ${trendTone(metric.trend)}`}>{metric.trend}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Industry Dashboard Sections</p>
                  <div className="mt-5 grid gap-4">
                    {module.metricGroups.map((group: MetricGroup) => (
                      <div key={group.title} className="rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-5">
                        <p className="text-sm font-black text-[#ECEBE7]">{group.title}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {group.metrics.map((metric: string) => (
                            <span key={metric} className="rounded-full border border-[#C9A961]/20 bg-[#1A1A1C] px-3 py-2 text-xs font-black text-[#A29E93]">
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
                        <span key={item} className="rounded-full border border-[#C9A961]/20 bg-[#111112] px-3 py-2 text-xs font-black text-[#A29E93]">
                          {item}
                        </span>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="AI Commentary Guidance">
                    <div className="grid gap-2">
                      {module.executiveCommentary.map((item: string) => (
                        <p key={item} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7]">
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
                      <p key={recommendation} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3 text-sm leading-6 text-[#ECEBE7]">
                        {recommendation}
                      </p>
                    ))}
                  </div>
                </Panel>

                <Panel title="Benchmarking Framework">
                  <p className="text-sm leading-6 text-[#A29E93]">{benchmarkingFramework.purpose}</p>
                  <div className="mt-4 grid gap-2">
                    {benchmarks.map((benchmark: BenchmarkPlaceholder) => (
                      <div key={benchmark.metric} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3 text-xs font-bold text-[#A29E93]">
                        <span className="text-[#ECEBE7]">{benchmark.metric}</span>: {benchmark.company} vs {benchmark.industryAverage}
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Operational Intelligence">
                  <div className="flex flex-wrap gap-2">
                    {module.operationalIntelligence.map((item: string) => (
                      <span key={item} className="rounded-full border border-[#C9A961]/40 bg-[#C9A961]/15 px-3 py-2 text-xs font-black text-[#DFC084]">
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

      <SiteFooter />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
