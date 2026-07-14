"use client";

import { useState, useTransition } from "react";
import { headingFont, focusRing } from "@/components/site-ui";
import { joinWaitlist } from "./actions";

const REVENUE_BANDS = [
  "Under $5M",
  "$5M – $25M",
  "$25M – $100M",
  "$100M – $500M",
  "Over $500M",
];

const ERP_OPTIONS = [
  "QuickBooks Enterprise",
  "Sage Intacct",
  "NetSuite",
  "Microsoft Dynamics 365",
  "SAP Business One",
  "Epicor",
  "Infor",
  "Xero",
  "Other",
];

export default function WaitlistForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await joinWaitlist(formData);
      if (result.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(
          result.error || "Something went wrong. Please try again.",
        );
      }
    });
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-8">
        <p className="text-[#C9A961] text-sm font-semibold mb-3 uppercase tracking-wider">
          You&apos;re on the list.
        </p>
        <h3 className={`${headingFont} text-2xl font-semibold mb-4`}>
          Thanks for joining.
        </h3>
        <p className="text-white/75 leading-relaxed">
          I&apos;ll read your submission personally and reach out when the
          private beta cohort is selected. If you&apos;re running a real
          manufacturing close, you&apos;re high on the list.
        </p>
        <p className="mt-6 text-sm text-white/55">— Matthew</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111112] p-8">
      <p className="text-[#C9A961] text-sm font-semibold mb-2 uppercase tracking-wider">
        Join the private beta waitlist
      </p>
      <h3 className={`${headingFont} text-2xl font-semibold mb-6`}>
        Ten controllers. This quarter.
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
            Name
          </label>
          <input
            name="name"
            type="text"
            required
            className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder-white/30 ${focusRing()}`}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
            Work email
          </label>
          <input
            name="email"
            type="email"
            required
            className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder-white/30 ${focusRing()}`}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
            Company
          </label>
          <input
            name="company"
            type="text"
            required
            className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder-white/30 ${focusRing()}`}
            placeholder="Company name"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Revenue band
            </label>
            <select
              name="revenue_band"
              required
              defaultValue=""
              className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white ${focusRing()}`}
            >
              <option value="" disabled>
                Select…
              </option>
              {REVENUE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Current ERP
            </label>
            <select
              name="current_erp"
              required
              defaultValue=""
              className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white ${focusRing()}`}
            >
              <option value="" disabled>
                Select…
              </option>
              {ERP_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
            What&apos;s the hardest part of your close? (optional)
          </label>
          <textarea
            name="pain_point"
            rows={3}
            className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white placeholder-white/30 resize-none ${focusRing()}`}
            placeholder="Variance analysis, WIP roll, absorption, disclosures…"
          />
        </div>
        {status === "error" && (
          <p className="text-sm text-red-400">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] hover:bg-[#DFC084] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${focusRing()}`}
        >
          {isPending ? "Submitting…" : "Join the waitlist"}
          {!isPending && <span aria-hidden>→</span>}
        </button>
        <p className="text-xs text-white/50">
          Matthew reads every submission personally. Cohort selection based on
          ERP, revenue band, and use case.
        </p>
      </form>
    </div>
  );
}
