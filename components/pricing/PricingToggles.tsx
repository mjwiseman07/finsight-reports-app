"use client";

import { useMemo, useState } from "react";
import { headingFont, focusRing } from "@/components/site-ui";

export type BillingInterval = "monthly" | "yearly";
export type RatePlan = "pilot" | "standard";

interface UsageBounds {
  base_included: number;
  overage_step: number;
  overage_price_monthly_cents: number; // per additional unit / mo
  unit_label: string; // e.g. "entity"
  unit_label_plural: string; // e.g. "entities"
  min: number;
  max: number;
}

interface Props {
  productName: string;
  ratePlan: RatePlan;
  onIntervalChange?: (interval: BillingInterval) => void;
  bounds: UsageBounds;
  monthlyStandardCents: number;
  monthlyPilotCents: number;
  yearlyStandardCents: number;
  yearlyPilotCents: number;
  yearlySavingsLabel?: string; // e.g. "Save 17%"
}

function formatUsd(cents: number, interval: BillingInterval): string {
  const dollars = cents / 100;
  const rounded = Math.round(dollars);
  const display =
    rounded === dollars
      ? rounded.toLocaleString()
      : dollars.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `$${display}/${interval === "monthly" ? "mo" : "yr"}`;
}

export function PricingCard({
  ratePlan,
  bounds,
  monthlyStandardCents,
  monthlyPilotCents,
  yearlyStandardCents,
  yearlyPilotCents,
  yearlySavingsLabel = "Save 17%",
  onIntervalChange,
}: Props) {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [usage, setUsage] = useState<number>(bounds.base_included);
  const [fadeKey, setFadeKey] = useState(0);

  const activeMonthlyBaseCents =
    ratePlan === "pilot" ? monthlyPilotCents : monthlyStandardCents;
  const activeYearlyBaseCents =
    ratePlan === "pilot" ? yearlyPilotCents : yearlyStandardCents;

  const overageUnits = Math.max(0, usage - bounds.base_included);
  const overageMonthlyCents = overageUnits * bounds.overage_price_monthly_cents;
  const overageYearlyCents = Math.round(overageMonthlyCents * 12 * 0.83); // 17% yearly discount

  const totalCents = useMemo(() => {
    return interval === "monthly"
      ? activeMonthlyBaseCents + overageMonthlyCents
      : activeYearlyBaseCents + overageYearlyCents;
  }, [
    interval,
    activeMonthlyBaseCents,
    activeYearlyBaseCents,
    overageMonthlyCents,
    overageYearlyCents,
  ]);

  const handleInterval = (next: BillingInterval) => {
    if (next === interval) return;
    setFadeKey((k) => k + 1);
    setInterval(next);
    onIntervalChange?.(next);
  };

  const handleUsageDelta = (delta: number) => {
    const next = Math.min(bounds.max, Math.max(bounds.min, usage + delta));
    if (next !== usage) {
      setFadeKey((k) => k + 1);
      setUsage(next);
    }
  };

  return (
    <div>
      {/* Yearly / Monthly toggle */}
      <div className="mt-4 mb-4 rounded-lg bg-[#1A1A1C]/40 p-1 flex text-xs font-medium relative">
        <button
          type="button"
          onClick={() => handleInterval("monthly")}
          className={`flex-1 rounded-md py-2 ${focusRing()} transition ${
            interval === "monthly"
              ? "bg-[#C9A961] text-[#111112]"
              : "text-[#A29E93]"
          }`}
          aria-pressed={interval === "monthly"}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => handleInterval("yearly")}
          className={`flex-1 rounded-md py-2 ${focusRing()} transition ${
            interval === "yearly"
              ? "bg-[#C9A961] text-[#111112]"
              : "text-[#A29E93]"
          }`}
          aria-pressed={interval === "yearly"}
        >
          Yearly
          <span className="ml-1 rounded bg-[#C9A961]/20 px-1.5 py-0.5 text-[10px] text-[#DFC084]">
            {yearlySavingsLabel}
          </span>
        </button>
      </div>

      {/* Usage stepper */}
      <div className="mb-4 rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/40 p-3">
        <div className="flex items-center justify-between mb-2 text-xs text-[#A29E93]">
          <span>How many {bounds.unit_label_plural}?</span>
          <span className="text-[#7A7974]">{bounds.base_included} included</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleUsageDelta(-1)}
            className={`w-11 h-11 rounded-lg border border-[#C9A961]/40 text-[#C9A961] text-lg ${focusRing()} hover:bg-[#C9A961]/10 disabled:opacity-30`}
            aria-label={`Decrease ${bounds.unit_label} count`}
            disabled={usage <= bounds.min}
          >
            −
          </button>
          <div
            key={`usage-${fadeKey}`}
            className="text-2xl font-semibold text-[#ECEBE7] tabular-nums animate-fade-in"
          >
            {usage}
            <span className="text-xs text-[#7A7974] ml-1 font-normal">
              {usage === 1 ? bounds.unit_label : bounds.unit_label_plural}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleUsageDelta(1)}
            className={`w-11 h-11 rounded-lg border border-[#C9A961]/40 text-[#C9A961] text-lg ${focusRing()} hover:bg-[#C9A961]/10 disabled:opacity-30`}
            aria-label={`Increase ${bounds.unit_label} count`}
            disabled={usage >= bounds.max}
          >
            +
          </button>
        </div>
        {overageUnits > 0 ? (
          <p className="mt-2 text-xs text-[#C9A961]">
            +{overageUnits} extra{" "}
            {overageUnits === 1 ? bounds.unit_label : bounds.unit_label_plural} × $
            {(bounds.overage_price_monthly_cents / 100).toFixed(0)}/mo each
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#7A7974]">Included in the base plan.</p>
        )}
      </div>

      {/* Total price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span
            key={`price-${fadeKey}`}
            className={`${headingFont} text-3xl font-semibold text-[#ECEBE7] tabular-nums animate-fade-in`}
          >
            {formatUsd(totalCents, interval)}
          </span>
          {ratePlan === "pilot" ? (
            <span className="text-xs text-[#C9A961]">Pilot rate</span>
          ) : null}
        </div>
        {ratePlan === "pilot" ? (
          <div className="mt-1 text-xs text-[#7A7974]">
            Standard after pilot ends:{" "}
            <span className="tabular-nums">
              {formatUsd(
                interval === "monthly"
                  ? monthlyStandardCents + overageMonthlyCents
                  : yearlyStandardCents + overageYearlyCents,
                interval,
              )}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
