"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ConsentValue = "all" | "functional" | "declined";

const COOKIE_NAME = "advisacor_cookie_consent";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 12 months

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function emitConsentEvent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("advisacor:cookie-consent", { detail: value }));
}

/**
 * Global helper for re-opening the banner from footer "Cookie preferences" link.
 * Dispatches a window event that CookieBanner listens for.
 */
export function showCookieBanner() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("advisacor:show-cookie-banner"));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if no consent yet.
    const existing = readCookie(COOKIE_NAME);
    if (!existing) setVisible(true);

    const handleShow = () => setVisible(true);
    window.addEventListener("advisacor:show-cookie-banner", handleShow);
    return () => window.removeEventListener("advisacor:show-cookie-banner", handleShow);
  }, []);

  const decide = useCallback((value: ConsentValue) => {
    writeCookie(COOKIE_NAME, value);
    emitConsentEvent(value);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-900">We use cookies to run Advisacor.</p>
          <p className="mt-1">
            Strictly necessary cookies (authentication, security, QuickBooks connection) always run — the Service
            can&apos;t function without them. Functional cookies remember your preferences. We do not currently use
            analytics or advertising cookies. See our{" "}
            <Link href="/privacy#cookies" className="text-[#C9A961] underline hover:text-[#a58749]">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Decline non-essential
          </button>
          <button
            type="button"
            onClick={() => decide("functional")}
            className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Functional only
          </button>
          <button
            type="button"
            onClick={() => decide("all")}
            className="rounded-lg bg-[#0B1E33] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0e2a48] focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
