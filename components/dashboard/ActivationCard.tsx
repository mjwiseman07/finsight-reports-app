"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { focusRing, headingFont, primaryCtaClass } from "../site-ui";
import { qbErrorCopy } from "@/lib/onboarding/qb-error-messages";
import {
  activationDismissStorageKey,
  isUsableCompanyName,
} from "@/lib/activation/lead-session";

type ActivationFacts = {
  hasConnectedBooks: boolean;
  companyName: string | null;
  provider: string | null;
  industryType: string | null;
  /** True only for a real Advisacor auth session (Bearer user). */
  isAuthenticated: boolean;
  /** True for free-review lead_free_review dashboard mode. */
  isLeadSession: boolean;
  companyId?: string | null;
  leadId?: string | null;
};

type Props = {
  facts: ActivationFacts;
  qbErrorCode?: string | null;
  checkoutSuccess?: boolean;
  onConnectQuickBooks: () => void | Promise<void>;
  onConnectXero: () => void | Promise<void>;
  onConfirmCompanyIdentity: (companyName: string) => Promise<void> | void;
  connecting?: boolean;
  identitySaving?: boolean;
};

/**
 * Progressive activation OS on /dashboard.
 * Blocking: connect books, identity when connected, OAuth errors.
 * Optional: industry enrichment (never blocks completion; still renderable).
 */
export default function ActivationCard({
  facts,
  qbErrorCode,
  checkoutSuccess,
  onConnectQuickBooks,
  onConnectXero,
  onConfirmCompanyIdentity,
  connecting = false,
  identitySaving = false,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [identityDraft, setIdentityDraft] = useState("");
  const [identityError, setIdentityError] = useState("");
  const errorCopy = qbErrorCode ? qbErrorCopy(qbErrorCode) : null;
  const dismissKey = activationDismissStorageKey({
    companyId: facts.companyId,
    leadId: facts.leadId,
  });

  const canConnect = facts.isAuthenticated || facts.isLeadSession;

  useEffect(() => {
    if (qbErrorCode || checkoutSuccess) {
      setDismissed(false);
      return;
    }
    setDismissed(window.localStorage.getItem(dismissKey) === "true");
  }, [qbErrorCode, checkoutSuccess, dismissKey]);

  useEffect(() => {
    if (isUsableCompanyName(facts.companyName)) {
      setIdentityDraft(String(facts.companyName));
    }
  }, [facts.companyName]);

  const needsConnect = !facts.hasConnectedBooks;
  const needsIdentityConfirm =
    facts.hasConnectedBooks && !isUsableCompanyName(facts.companyName);
  const needsIndustry =
    facts.hasConnectedBooks &&
    isUsableCompanyName(facts.companyName) &&
    !String(facts.industryType || "").trim();

  /** Blocking checklist complete (industry is optional enrichment). */
  const blockingComplete = !needsConnect && !needsIdentityConfirm && !errorCopy;
  /** Show optional industry prompt when blocking work is done. */
  const showOptionalIndustry = blockingComplete && needsIndustry && !dismissed;

  const headline = useMemo(() => {
    if (checkoutSuccess && needsConnect) return "Welcome — your plan is active";
    if (errorCopy) return errorCopy.title;
    if (needsConnect) return "Connect your books to activate Advisacor";
    if (needsIdentityConfirm) return "Confirm your company identity";
    if (showOptionalIndustry) return "One more detail for better intelligence";
    return "You're ready";
  }, [
    checkoutSuccess,
    errorCopy,
    needsConnect,
    needsIdentityConfirm,
    showOptionalIndustry,
  ]);

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
    if (showOptionalIndustry) {
      return "Industry helps Advisacor choose the right KPIs and disclosures. You can set this later in company settings if you prefer.";
    }
    return "Your activation checklist is clear. Intelligence will deepen as more data syncs.";
  }, [
    errorCopy,
    checkoutSuccess,
    needsConnect,
    needsIdentityConfirm,
    showOptionalIndustry,
    facts.isLeadSession,
  ]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(dismissKey, "true");
    setDismissed(true);
  }, [dismissKey]);

  const clearQbErrorFromUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("qbError") && !url.searchParams.has("intuitError")) return;
    url.searchParams.delete("qbError");
    url.searchParams.delete("intuitError");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  const submitIdentity = useCallback(async () => {
    setIdentityError("");
    const nextName = identityDraft.trim();
    if (!isUsableCompanyName(nextName)) {
      setIdentityError("Enter the company name Advisacor should use.");
      return;
    }
    try {
      await onConfirmCompanyIdentity(nextName);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : "Unable to save company name.");
    }
  }, [identityDraft, onConfirmCompanyIdentity]);

  const shouldHide =
    blockingComplete &&
    !showOptionalIndustry &&
    !checkoutSuccess &&
    !errorCopy &&
    (dismissed || !needsIndustry);

  if (shouldHide) return null;

  if (
    blockingComplete &&
    !showOptionalIndustry &&
    !checkoutSuccess &&
    !errorCopy &&
    !needsConnect &&
    !needsIdentityConfirm
  ) {
    return null;
  }

  return (
    <section className="relative rounded-2xl border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-6 text-[#ECEBE7]">
      {!errorCopy && !needsConnect && !needsIdentityConfirm && (
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

      {facts.hasConnectedBooks && isUsableCompanyName(facts.companyName) && (
        <p className="mt-3 text-sm text-[#ECEBE7]">
          Connected
          {facts.provider ? ` via ${facts.provider}` : ""}
          {": "}
          <span className="font-semibold">{facts.companyName}</span>
        </p>
      )}

      {needsIdentityConfirm && (
        <div className="mt-5 max-w-xl space-y-3">
          <label className="block text-sm font-semibold text-[#ECEBE7]" htmlFor="activation-company-name">
            Company name
          </label>
          <input
            id="activation-company-name"
            type="text"
            value={identityDraft}
            onChange={(e) => setIdentityDraft(e.target.value)}
            placeholder="e.g. Sandbox Company CA b483"
            className={focusRing(
              "w-full rounded-xl border border-[#C9A961]/25 bg-[#111112] px-4 py-2.5 text-sm text-[#ECEBE7] placeholder:text-[#7A7974]",
            )}
          />
          {identityError && (
            <p role="alert" className="text-sm font-semibold text-[#F0BFBF]">
              {identityError}
            </p>
          )}
          <button
            type="button"
            disabled={identitySaving}
            onClick={() => void submitIdentity()}
            className={focusRing(primaryCtaClass)}
          >
            {identitySaving ? "Saving…" : "Confirm company name"}
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {(needsConnect || errorCopy) && (
          <>
            <button
              type="button"
              disabled={connecting || !canConnect}
              onClick={() => {
                clearQbErrorFromUrl();
                void onConnectQuickBooks();
              }}
              className={focusRing(`${primaryCtaClass} rounded-full px-5 py-2.5`)}
            >
              {connecting ? "Starting…" : "Connect QuickBooks"}
            </button>
            <button
              type="button"
              disabled={connecting || !canConnect}
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
            {!canConnect && (
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
        {showOptionalIndustry && (
          <a
            href="/dashboard/account"
            className={focusRing(
              "rounded-full border border-[#C9A961]/30 px-5 py-2.5 text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]/50",
            )}
          >
            Add industry later
          </a>
        )}
        {(showOptionalIndustry ||
          (!needsConnect && !errorCopy && !needsIdentityConfirm)) && (
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
