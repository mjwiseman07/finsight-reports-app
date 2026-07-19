'use client';

import { useEffect, useState } from 'react';

interface Summary {
  totalSpendCents: number;
  totalCalls: number;
  capCents: number;
  pctOfCap: number;
  status: 'under_threshold' | 'over_threshold_fallback' | 'over_cap_blocked';
  byModel: Record<string, { calls: number; spendCents: number }>;
}

const STATUS_COPY: Record<
  Summary['status'],
  { label: string; color: string }
> = {
  under_threshold: {
    label: 'Sonnet (premium model)',
    color: 'border-[#C9A961]/30 bg-[#1A1A1C]/50 text-[#ECEBE7]',
  },
  over_threshold_fallback: {
    label: 'Haiku fallback active (>90% cap)',
    color: 'border-[#C9A961]/40 bg-[#1A1A1C] text-[#DFC084]',
  },
  over_cap_blocked: {
    label: 'Cap reached — pass-through billing required',
    color: 'border-red-500/40 bg-red-950/40 text-red-200',
  },
};

export function EngagementCostTile({ engagementId }: { engagementId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/audit-ready/${engagementId}/usage`);
      if (!res.ok) return;
      const json = (await res.json()) as Summary;
      if (!cancelled) setSummary(json);
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [engagementId]);

  if (!summary) return null;

  const status = STATUS_COPY[summary.status];
  const dollars = (summary.totalSpendCents / 100).toFixed(2);
  const cap = (summary.capCents / 100).toFixed(2);
  const pct = summary.pctOfCap.toFixed(0);

  return (
    <div className={`rounded-lg border p-4 ${status.color}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#7A7974]">
            Bedrock spend this engagement
          </div>
          <div className="text-2xl font-semibold tabular-nums text-[#ECEBE7]">
            ${dollars}{' '}
            <span className="text-sm text-[#A29E93]">/ ${cap}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-[#7A7974]">
            {pct}% of cap
          </div>
          <div className="text-sm text-[#A29E93]">{summary.totalCalls} calls</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-[#A29E93]">
        <span className="font-medium text-[#ECEBE7]">Current model: </span>
        {status.label}
      </div>
    </div>
  );
}
