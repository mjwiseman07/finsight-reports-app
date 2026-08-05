"use client";

import { useParams } from "next/navigation";
import { headingFont } from "@/components/site-ui";
import { LifecycleTimeline } from "@/components/audit-ready/LifecycleTimeline";

export default function LifecycleTimelinePage() {
  const params = useParams<{ engagementId: string }>();
  const engagementId = params?.engagementId ?? "";

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
              Pilot lifecycle timeline
            </h1>
            <p className="mt-1 text-[#A29E93]">
              Every state change is written to a tamper-evident hash chain. Each
              row is verified both by the server (
              <span className="font-mono">
                pilot_lifecycle_events_verify_chain
              </span>
              ) and re-verified locally in your browser using Web Crypto SHA-256.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/audit-ready/${engagementId}/pbc-list`}
              className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#ECEBE7] hover:bg-[#1A1A1C]/80"
            >
              PBC List
            </a>
            <a
              href={`/api/audit-ready/${engagementId}/assertion-coverage/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#C9A961] hover:bg-[#1A1A1C]/80"
            >
              Coverage PDF
            </a>
            <a
              href={`/audit-ready/${engagementId}/tie-out-summary`}
              className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#ECEBE7] hover:bg-[#1A1A1C]/80"
            >
              Tie-Out Summary
            </a>
          </div>
        </header>

        <LifecycleTimeline engagementId={engagementId} />
      </div>
    </main>
  );
}
