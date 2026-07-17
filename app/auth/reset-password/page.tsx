"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteNav } from "../../../components/SiteNav";
import { focusRing, headingFont, primaryCtaClass } from "../../../components/site-ui";
import { supabase } from "../../../lib/supabase";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";

type Phase = "loading" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset landing supports three arrival paths:
    //
    //  1) Preferred (Supabase docs, cross-device):
    //     Email link points to /auth/confirm?token_hash=xxx&type=recovery&next=/auth/reset-password
    //     The confirm route calls verifyOtp() server-side and sets auth cookies BEFORE
    //     redirecting here — so we just check for the session and show the form.
    //
    //  2) Query error from confirm route:
    //     /auth/reset-password?error=invalid_link → show "Link expired or invalid"
    //
    //  3) Legacy fallbacks (during template migration, or if a user has an old email):
    //     3a) PKCE: /auth/reset-password?code=xxx  → exchangeCodeForSession
    //     3b) Implicit: /auth/reset-password#access_token=...&type=recovery → auto-processed
    let cancelled = false;
    async function check() {
      try {
        const url = new URL(window.location.href);
        // Path 2 — explicit error from confirm route
        if (url.searchParams.get("error")) {
          setPhase("invalid");
          return;
        }
        // Path 3a — legacy PKCE (kept for old outstanding emails)
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exchangeError) {
            setPhase("invalid");
            return;
          }
          url.searchParams.delete("code");
          window.history.replaceState(null, "", url.pathname + url.search + url.hash);
          setPhase("ready");
          return;
        }
        // Path 1 + Path 3b — session should already exist (set by /auth/confirm server-side)
        // or is being auto-processed from the hash fragment by supabase-js.
        // One microtask yield lets any client-side hash processing complete.
        await new Promise((r) => setTimeout(r, 0));
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError || !data.session) {
          setPhase("invalid");
          return;
        }
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("invalid");
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Persist the freshly-established session cookie the same way signin does.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        window.localStorage.setItem("supabase_access_token", accessToken);
        const maxAge = sessionData.session?.expires_in ?? 3600;
        document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      setPhase("success");
      // Small delay so the success message can be read before redirect.
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setError("Unable to update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <section
        id="reset-password"
        className="relative isolate overflow-hidden bg-[#111112] px-6 pb-24 pt-[200px] md:pt-[240px] lg:pt-[260px]"
      >
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-[#141416] p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A961]">
              Password Recovery
            </p>

            {phase === "loading" && (
              <h1 className={`mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white ${headingFont}`}>
                Verifying your link...
              </h1>
            )}

            {phase === "invalid" && (
              <>
                <h1 className={`mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white ${headingFont}`}>
                  Link expired or invalid
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  This password reset link is no longer valid. Reset links expire after 1 hour. Please request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm ${primaryCtaClass} ${focusRing()}`}
                >
                  Request a new link
                </Link>
              </>
            )}

            {phase === "ready" && (
              <>
                <h1 className={`mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white ${headingFont}`}>
                  Set a new password
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Choose a new password for your Advisacor account. Minimum 8 characters.
                </p>
                <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                      New password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
                      placeholder="Minimum 8 characters"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
                      Confirm password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={`w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-slate-500 ${focusRing()}`}
                      placeholder="Re-enter password"
                    />
                  </label>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`mt-2 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${primaryCtaClass} ${focusRing()}`}
                  >
                    {isSubmitting ? "Updating..." : "Update password"}
                  </button>
                </form>
              </>
            )}

            {phase === "success" && (
              <>
                <h1 className={`mt-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white ${headingFont}`}>
                  Password updated
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Signing you in and redirecting to your dashboard...
                </p>
              </>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
