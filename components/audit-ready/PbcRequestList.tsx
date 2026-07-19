'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  ASSERTION_METADATA,
  type Assertion,
} from '@/lib/audit-ready/assertion-taxonomy';

interface PbcRequest {
  id: string;
  request_number: string;
  request_description: string;
  requested_by: string | null;
  assertion_tags: string[];
  source_account_hint: string | null;
  due_date: string | null;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#1A1A1C] text-[#A29E93] border border-[#C9A961]/20',
  in_progress: 'bg-[#1A1A1C] text-[#DFC084] border border-[#C9A961]/30',
  submitted: 'bg-[#1A1A1C] text-[#ECEBE7] border border-[#C9A961]/40',
  accepted: 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/30',
  rework_needed: 'bg-red-950/40 text-red-200 border border-red-500/30',
  withdrawn: 'bg-[#1A1A1C]/40 text-[#7A7974] line-through',
};

function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}

export function PbcRequestList({
  engagementId,
  refreshKey,
}: {
  engagementId: string;
  refreshKey: number;
}) {
  const [requests, setRequests] = useState<PbcRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const client = getBrowserSupabase();
      const { data } = await client
        .from('audit_ready_pbc_requests')
        .select(
          'id, request_number, request_description, requested_by, assertion_tags, source_account_hint, due_date, status',
        )
        .eq('engagement_id', engagementId)
        .order('request_number', { ascending: true });
      if (!cancelled) {
        setRequests((data ?? []) as PbcRequest[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId, refreshKey]);

  if (loading) return <p className="text-[#A29E93]">Loading requests…</p>;
  if (requests.length === 0) {
    return (
      <p className="text-[#A29E93]">
        No PBC requests yet. Upload a list above.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50">
      <table className="w-full text-sm">
        <thead className="bg-[#1A1A1C]">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-[#A29E93]">
              Req #
            </th>
            <th className="px-4 py-3 text-left font-medium text-[#A29E93]">
              Description
            </th>
            <th className="px-4 py-3 text-left font-medium text-[#A29E93]">
              Assertions
            </th>
            <th className="px-4 py-3 text-left font-medium text-[#A29E93]">
              Due
            </th>
            <th className="px-4 py-3 text-left font-medium text-[#A29E93]">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#C9A961]/10">
          {requests.map((r) => (
            <tr key={r.id} className="hover:bg-[#1A1A1C]/60">
              <td className="px-4 py-3 font-mono text-[#ECEBE7]">
                {r.request_number}
              </td>
              <td className="px-4 py-3 text-[#ECEBE7]">
                {r.request_description}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(r.assertion_tags ?? []).map((a) => (
                    <span
                      key={a}
                      title={ASSERTION_METADATA[a as Assertion]?.short_definition}
                      className="inline-block rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-2 py-0.5 text-xs text-[#A29E93]"
                    >
                      {ASSERTION_METADATA[a as Assertion]?.label ?? a}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-[#A29E93]">{r.due_date ?? '—'}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[r.status] ?? STATUS_STYLES.pending}`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
