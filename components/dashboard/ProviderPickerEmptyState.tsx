"use client";

import { useState, type ReactNode } from "react";
import { focusRing, headingFont } from "@/components/site-ui";

type ProviderPickerEmptyStateProps = {
  onConnectQBO: () => void;
  onConnectXero: () => void;
  companyName?: string;
};

type FutureProvider = {
  id: string;
  label: string;
  reason: string;
};

const FUTURE_PROVIDERS: FutureProvider[] = [
  { id: "sage-intacct", label: "Sage Intacct", reason: "Coming soon" },
  { id: "netsuite", label: "NetSuite", reason: "Coming soon" },
  { id: "freshbooks", label: "FreshBooks", reason: "Coming soon" },
  { id: "sage-50", label: "Sage 50", reason: "Coming soon" },
];

export default function ProviderPickerEmptyState({
  onConnectQBO,
  onConnectXero,
}: ProviderPickerEmptyStateProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="rounded-[2rem] border border-[#3A3A3D] bg-[#111113] p-6">
      <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A961]`}>
        Your Scorecard
      </p>
      <p className={`${headingFont} mt-2 text-2xl font-semibold tracking-[-0.01em] text-[#ECEBE7]`}>
        Connect your books to get started
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#ECEBE7]/70">
        Advisacor reads your QuickBooks or Xero data to build your Scorecard automatically. No spreadsheets, no setup wizard.
      </p>

      <div
        role="group"
        aria-label="Choose your accounting provider"
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <ProviderTile
          providerName="QuickBooks"
          providerTagline="QuickBooks Online — real-time general ledger, AR, AP, and bank connections."
          onConnect={onConnectQBO}
          logoNode={
            <span
              aria-hidden
              className={`${headingFont} text-2xl font-semibold tracking-tight text-[#2CA01C]`}
            >
              QB
            </span>
          }
        />
        <ProviderTile
          providerName="Xero"
          providerTagline="Xero — cloud accounting with contact, invoice, and bank feed sync."
          onConnect={onConnectXero}
          logoNode={
            <span
              aria-hidden
              className={`${headingFont} text-2xl font-semibold tracking-tight text-[#13B5EA]`}
            >
              XR
            </span>
          }
        />
      </div>

      <p className="mt-4 text-xs text-[#ECEBE7]/50">
        You&apos;ll sign in on QuickBooks&apos; or Xero&apos;s site. Advisacor never sees your login credentials.
      </p>

      <div className="mt-6 border-t border-[#3A3A3D] pt-4">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          aria-controls="future-provider-list"
          className={focusRing(
            "text-sm text-[#C9A961] underline underline-offset-2 hover:text-[#DFC084]"
          )}
        >
          {showMore ? "Hide other providers" : "Don't see your software? Search all providers"}
        </button>
        {showMore ? (
          <ul
            id="future-provider-list"
            className="mt-3 grid gap-2 sm:grid-cols-2"
          >
            {FUTURE_PROVIDERS.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[#3A3A3D] bg-[#1B1B1D]/60 px-3 py-2"
              >
                <span className="text-sm text-[#ECEBE7]/80">{p.label}</span>
                <span className="text-xs text-[#BB653B]">{p.reason}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

type ProviderTileProps = {
  providerName: string;
  providerTagline: string;
  onConnect: () => void;
  logoNode: ReactNode;
};

function ProviderTile({
  providerName,
  providerTagline,
  onConnect,
  logoNode,
}: ProviderTileProps) {
  return (
    <div className="flex flex-col rounded-2xl border-2 border-[#3A3A3D] bg-[#1B1B1D] p-5 transition-colors hover:border-[#C9A961]/60">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ECEBE7]">
          {logoNode}
        </div>
        <div className="flex-1">
          <p className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}>{providerName}</p>
          <p className="mt-1 text-sm leading-5 text-[#ECEBE7]/60">{providerTagline}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onConnect}
        className={focusRing(
          "mt-4 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#C9A961] bg-[#C9A961] px-4 py-2.5 text-sm font-semibold text-[#1B1B1D] transition-colors hover:border-[#DFC084] hover:bg-[#DFC084]"
        )}
      >
        Connect {providerName}
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
