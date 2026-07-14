"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";
import {
  buildHealthcareExecutiveCommentary,
  buildPerPatientDayChartSeries,
  buildPerPatientDayTrendAnalysis,
  calculatePerPatientDayMetrics,
  healthcareDemoOperationalStats,
  futureHealthcareIntelligenceMetrics,
  perPatientDayMetricDefinitions,
} from "../../lib/healthcare-operational-intelligence";

type HealthcareStats = {
  periodLabel: string;
  patientDays: number;
  totalOperatingExpenses: number;
  payrollExpense: number;
  totalRevenue: number;
  medicalSuppliesExpense: number;
  contractLaborExpense: number;
};

type PatientDayMetric = {
  id: string;
  label: string;
  value: number | null;
};

type TrendItem = {
  id: string;
  label: string;
  currentValue: number | null;
  comparisonValue: number | null;
  percentChange: number | null;
};

const sampleStats = healthcareDemoOperationalStats as HealthcareStats[];

function formatCurrency(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function HealthcareIntelligencePage() {
  const [manualStats, setManualStats] = useState<HealthcareStats>(sampleStats[2]);
  const rows = useMemo(() => [...sampleStats.slice(0, 2), manualStats], [manualStats]);
  const currentMetrics = calculatePerPatientDayMetrics(manualStats) as Record<string, PatientDayMetric>;
  const trendAnalysis = buildPerPatientDayTrendAnalysis(manualStats, {
    priorMonth: rows[1],
    priorQuarter: rows[0],
    priorYear: rows[0],
  }) as Record<string, TrendItem[]>;
  const commentary = buildHealthcareExecutiveCommentary({
    currentStats: manualStats,
    priorQuarterStats: rows[1],
    priorYearStats: rows[0],
  });
  const chartSeries = buildPerPatientDayChartSeries(rows);

  const updateStat = (key: keyof HealthcareStats, value: string) => {
    setManualStats((current) => ({
      ...current,
      [key]: key === "periodLabel" ? value : Number(value || 0),
    }));
  };

  return (
    <div className={`min-h-screen bg-[#111112] text-[#ECEBE7] ${headingFont}`}>
      <SiteNav />

      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 rounded-3xl border border-[#C9A961]/25 bg-[#1A1A1C]/85 px-5 py-4 shadow-2xl shadow-black/40 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Vertical Intelligence</p>
              <p className="mt-1 text-lg font-black text-[#ECEBE7]">Healthcare Operational Data</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/industry-intelligence" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ECEBE7] hover:border-[#C9A961]/50">
                Industry Framework
              </Link>
              <Link href="/onboarding" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ECEBE7] hover:border-[#C9A961]/50">
                Industry Onboarding
              </Link>
            </div>
          </header>

          <section className="mt-8 rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-8 shadow-2xl shadow-black/40">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Healthcare Operational Intelligence</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#ECEBE7] md:text-5xl">Per Patient Day foundation.</h1>
            <p className="mt-3 max-w-3xl leading-7 text-[#A29E93]">
              Available when <code className="rounded bg-[#111112] px-1.5 py-0.5 text-[#DFC084]">industry_type = Healthcare</code>. These metrics connect financial results to patient volume so executive commentary can explain revenue, labor, supplies, and contract labor per occupied day.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#6DAA45]/40 bg-[#6DAA45]/10 px-3 py-1 text-xs font-black text-[#B5E28A]">Healthcare Demo Company</span>
              <span className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-1 text-xs font-black text-[#A29E93]">3 monthly periods seeded</span>
              <span className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-1 text-xs font-black text-[#A29E93]">Manual, census upload, and imported stats examples</span>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Healthcare Demo Operational Data</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Period" value={manualStats.periodLabel} onChange={(value) => updateStat("periodLabel", value)} />
                <Field label="Patient Days" value={String(manualStats.patientDays)} onChange={(value) => updateStat("patientDays", value)} />
                <Field label="Total Revenue" value={String(manualStats.totalRevenue)} onChange={(value) => updateStat("totalRevenue", value)} />
                <Field label="Total Operating Expenses" value={String(manualStats.totalOperatingExpenses)} onChange={(value) => updateStat("totalOperatingExpenses", value)} />
                <Field label="Payroll Expense" value={String(manualStats.payrollExpense)} onChange={(value) => updateStat("payrollExpense", value)} />
                <Field label="Medical Supplies Expense" value={String(manualStats.medicalSuppliesExpense)} onChange={(value) => updateStat("medicalSuppliesExpense", value)} />
                <Field label="Contract Labor Expense" value={String(manualStats.contractLaborExpense)} onChange={(value) => updateStat("contractLaborExpense", value)} />
              </div>
              <div className="mt-5 rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-4 text-sm leading-6 text-[#ECEBE7]">
                Supported storage sources: manual patient day entry, uploaded census data, and imported operational statistics. Stored by month, quarter, or year through <code className="rounded bg-[#111112] px-1.5 py-0.5 text-[#DFC084]">/api/healthcare/operational-stats</code>.
              </div>
              <div className="mt-4 grid gap-2">
                {rows.map((row) => (
                  <div key={row.periodLabel} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-xs font-bold text-[#A29E93]">
                    <span className="text-[#ECEBE7]">{row.periodLabel}</span>: {row.patientDays.toLocaleString()} patient days | Revenue {formatCurrency(row.totalRevenue)} | Expenses {formatCurrency(row.totalOperatingExpenses)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Per Patient Day Trend Charts</p>
              <div className="mt-5">
                <TrendChart series={chartSeries} />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-5">
            {perPatientDayMetricDefinitions.map((definition) => {
              const metric = currentMetrics[definition.id];
              const priorYear = trendAnalysis.priorYear?.find((item) => item.id === definition.id);
              return (
                <div key={definition.id} className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7A7974]">{definition.label}</p>
                  <p className="mt-3 text-2xl font-black text-[#DFC084]">{formatCurrency(metric.value)}</p>
                  <p className="mt-2 text-xs font-bold text-[#A29E93]">vs prior year {formatPercent(priorYear?.percentChange ?? null)}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Executive Commentary</p>
              <div className="mt-4 grid gap-3">
                {commentary.map((item) => (
                  <p key={item} className="rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3 text-sm leading-6 text-[#ECEBE7]">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]">Future Healthcare Module</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {futureHealthcareIntelligenceMetrics.map((metric) => (
                  <span key={metric} className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-2 text-xs font-black text-[#A29E93]">
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#A29E93]">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-[#ECEBE7] outline-none ring-[#C9A961]/50 focus:ring-2 focus:border-[#C9A961]/60"
      />
    </label>
  );
}

function TrendChart({ series }: { series: Array<Record<string, number | string | null>> }) {
  const chartHeight = 240;
  const chartWidth = 760;
  const metrics = ["revenuePerPatientDay", "expensePerPatientDay", "laborCostPerPatientDay", "supplyCostPerPatientDay", "contractLaborPerPatientDay"];
  const colors: Record<string, string> = {
    revenuePerPatientDay: "#20808D",
    expensePerPatientDay: "#A84B2F",
    laborCostPerPatientDay: "#5591C7",
    supplyCostPerPatientDay: "#C9A961",
    contractLaborPerPatientDay: "#944454",
  };

  const values = series.flatMap((row) => metrics.map((metric) => Number(row[metric] || 0)));
  const minValue = Math.min(...values) * 0.92;
  const maxValue = Math.max(...values) * 1.04;
  const xStep = chartWidth / Math.max(series.length - 1, 1);

  const pointsForMetric = (metric: string) =>
    series
      .map((row, index) => {
        const value = Number(row[metric] || 0);
        const x = index * xStep;
        const y = chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="overflow-hidden rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-5">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 42}`} className="h-[300px] w-full">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="0" x2={chartWidth} y1={(chartHeight / 3) * line} y2={(chartHeight / 3) * line} stroke="rgba(201,169,97,0.15)" />
        ))}
        {metrics.map((metric) => (
          <polyline key={metric} fill="none" stroke={colors[metric]} strokeWidth="3" points={pointsForMetric(metric)} />
        ))}
        {series.map((row, index) => (
          <text key={String(row.period)} x={index * xStep} y={chartHeight + 30} fill="#A29E93" fontSize="15" fontWeight="700" textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>
            {row.period}
          </text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-black">
        <span className="text-[#20808D]">Revenue Per Patient Day</span>
        <span className="text-[#A84B2F]">Expense Per Patient Day</span>
        <span className="text-[#5591C7]">Labor Cost Per Patient Day</span>
        <span className="text-[#C9A961]">Supply Cost Per Patient Day</span>
        <span className="text-[#944454]">Contract Labor Per Patient Day</span>
      </div>
    </div>
  );
}
