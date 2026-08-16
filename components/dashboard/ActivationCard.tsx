"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { focusRing, headingFont, primaryCtaClass } from "../site-ui";
import { qbErrorCopy } from "@/lib/onboarding/qb-error-messages";

type ActivationFacts = {
  hasConnectedBooks: boolean;
  companyName: string | null;
  provider: string | null;
  industryType: string | null;
  isAuthenticated: boolean;
  isLeadSession: boolean;
};

type Props = {
  facts: ActivationFacts;
  qbErrorCode?: string | null;
  checkoutSuccess?: boolean;
  onConnectQuickBooks: () => void | Promise<void>;
  onConnectXero: () => void | Promise<void>;
  connecting?: boolean;
};

const DISMISS_KEY = "advisacor_dashboard_activation_dismissed_v1";

/**
 * Progressive activation OS on /dashboard.
 * Asks only for what Advisacor cannot yet infer; completed actions disappear.
 */
export default function ActivationCard({
  facts,
  qbErrorCode,
  checkoutSuccess,
  onConnectQuickBooks,
  onConnectXero,
  connecting = false,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const errorCopy = qbErrorCode ? qbErrorCopy(qbErrorCode) : null;

  useEffect(() => {
    // Never auto-dismiss while an OAuth error or checkout handoff is present.
    if (qbErrorCode || checkoutSuccess) {
      setDismissed(false);
      return;
    }
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, [qbErrorCode, checkoutSuccess]);

  const needsConnect = !facts.hasConnectedBooks;
  const needsIdentityConfirm =
    facts.hasConnectedBooks && !String(facts.companyName || "").trim();
  const needsIndustry =
    facts.hasConnectedBooks && !String(facts.industryType || "").trim();

  const isComplete = !needsConnect && !needsIdentityConfirm && !errorCopy;

  const headline = useMemo(() => {
    if (checkoutSuccess) return "Welcome — your plan is active";
    if (errorCopy) return errorCopy.title;
    if (needsConnect) return "Connect your books to activate Advisacor";
    if (needsIdentityConfirm) return "Confirm your company identity";
    if (needsIndustry) return "One more detail for better intelligence";
    return "You're ready";
  }, [checkoutSuccess, errorCopy, needsConnect, needsIdentityConfirm, needsIndustry]);

  const body = useMemo(() => {
    if (errorCopy) return errorCopy.body;
    if (checkoutSuccess && needsConnect) {
      return "Connect QuickBooks or Xero so Advisacor can learn your company and start surfacing intelligence.";
    }
    if (needsConnect) {
      return facts.isLeadSession
        ? "Connect accounting to continue your free review inside the dashboard — no separate wizard."
        : "Advisacor works best with a live connection. Connect QuickBooks or Xero to populate your company profile and unlock intelligence.";
    }
    if (needsIdentityConfirm) {
      return "We connected your books but still need a company name to label your workspace.";
    }
    if (needsIndustry) {
      return "Industry helps Advisacor choose the right KPIs and disclosures. You can set this later in company settings if you prefer.";
    }
    return "Your activation checklist is clear. Intelligence will deepen as more data syncs.";
  }, [errorCopy, checkoutSuccess, needsConnect, needsIdentityConfirm, needsIndustry, facts.isLeadSession]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }, []);

  const clearQbErrorFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("qbError") && !url.searchParams.has("intuitError")) return;
    url.searchParams.delete("qbError");
    url.searchParams.delete("intuitError");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  // Fully complete + no error + user previously dismissed → hide
  if (isComplete && dismissed && !checkoutSuccess) return null;
  // Nothing to ask and no banners
  if (isComplete && !checkoutSuccess && !errorCopy) return null;

  return (
    <section className="relative rounded-2xl border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-6 text-[#ECEBE7]">
      {!errorCopy && !needsConnect && (
        <button
          type="button"
          aria-label="Dismiss activation"
          onClick={dismiss}
          className={focusRing(
            "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#7A7974] hover:text-[#ECEBE7]",
          )}
        >
          ✕
        </button>
      )}

      <p className={`${headingFont} text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]`}>
        Activation
      </p>
      <h2 className={`${headingFont} mt-2 text-xl font-semibold text-[#ECEBE7]`}>{headline}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A29E93]">{body}</p>

      {facts.hasConnectedBooks && facts.companyName && (
        <p className="mt-3 text-sm text-[#ECEBE7]">
          Connected
          {facts.provider ? ` via ${facts.provider}` : ""}
          {": "}
          <span className="font-semibold">{facts.companyName}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {(needsConnect || errorCopy) && (
          <>
            <button
              type="button"
              disabled={connecting || !facts.isAuthenticated}
              onClick={() => {
                clearQbErrorFromUrl();
                void onConnectQuickBooks();
              }}
              className={focusRing(primaryCtaClass)}
            >
              {connecting ? "Starting…" : "Connect QuickBooks"}
            </button>
            <button
              type="button"
              disabled={connecting || !facts.isAuthenticated}
              onClick={() => {
                clearQbErrorFromUrl();
                void onConnectXero();
              }}
              className={focusRing(
                "rounded-full border border-[#C9A961]/30 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]/50",
              )}
            >
              Connect Xero
            </button>
            {!facts.isAuthenticated && (
              <a
                href="/signin?next=/dashboard"
                className={focusRing(
                  "rounded-full border border-[#C9A961]/25 px-5 py-2.5 text-sm font-semibold text-[#C9A961]",
                )}
              >
                Sign in to connect
              </a>
            )}
          </>
        )}
        {needsIndustry && !needsConnect && !errorCopy && (
          <a
            href="/dashboard/account"
            className={focusRing(
              "rounded-full border border-[#C9A961]/30 px-5 py-2.5 text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]/50",
            )}
          >
            Add industry later
          </a>
        )}
        {!needsConnect && !errorCopy && (
          <button
            type="button"
            onClick={dismiss}
            className={focusRing("text-sm font-semibold text-[#7A7974] hover:text-[#A29E93]")}
          >
            Continue exploring
          </button>
        )}
      </div>
    </section>
  );
}
