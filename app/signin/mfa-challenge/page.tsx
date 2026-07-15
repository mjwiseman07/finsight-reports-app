"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { focusRing, headingFont, primaryCtaClass } from "@/components/site-ui";
import { consumeRecoveryCode, verifyMfaChallenge } from "@/lib/mfa/actions";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { supabase } from "@/lib/supabase";

function MfaChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") || "/dashboard";
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const persistToken = (accessToken: string, expiresIn: number) => {
    window.localStorage.setItem("supabase_access_token", accessToken);
    document.cookie = `${ADVISACOR_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${expiresIn}; SameSite=Lax`;
  };

  const submitTotp = () => {
    setError("");
    startTransition(async () => {
      const result = await verifyMfaChallenge(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      persistToken(result.data.accessToken, result.data.expiresIn);
      router.replace(returnTo.startsWith("/") ? returnTo : "/dashboard");
    });
  };

  const submitRecovery = () => {
    setError("");
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Sign in again.");
        router.replace("/signin");
        return;
      }
      const result = await consumeRecoveryCode(user.id, recovery);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Recovery resets MFA factors — continue at AAL1 to re-enroll.
      router.replace("/dashboard/account/security?enforcement=required");
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#C9A961]/40 bg-[#0B1A3A] p-8 shadow-2xl sm:p-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A961] sm:text-xs">
        Multi-factor authentication
      </p>
      <h1
        className={`mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl ${headingFont}`}
      >
        Confirm it&apos;s you
      </h1>
      <p className="mt-3 text-sm text-white/70">
        {mode === "totp"
          ? "Enter the 6-digit code from your authenticator app."
          : "Enter one unused recovery code. This will reset MFA and require re-enrollment."}
      </p>

      {mode === "totp" ? (
        <form
          className="mt-7 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitTotp();
          }}
        >
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
              Authenticator code
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className={`rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-lg tracking-[0.35em] text-white ${focusRing("focus-visible:ring-offset-[#0B1A3A]")}`}
              placeholder="000000"
            />
          </label>
          <button
            type="submit"
            disabled={pending || code.length !== 6}
            className={`rounded-xl px-4 py-3 text-sm disabled:opacity-60 ${primaryCtaClass} ${focusRing("focus-visible:ring-offset-[#0B1A3A]")}`}
          >
            {pending ? "Verifying…" : "Verify"}
          </button>
        </form>
      ) : (
        <form
          className="mt-7 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitRecovery();
          }}
        >
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]">
              Recovery code
            </span>
            <input
              value={recovery}
              onChange={(e) => setRecovery(e.target.value.toUpperCase())}
              required
              className={`rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm text-white ${focusRing("focus-visible:ring-offset-[#0B1A3A]")}`}
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
          </label>
          <button
            type="submit"
            disabled={pending || recovery.trim().length < 8}
            className={`rounded-xl px-4 py-3 text-sm disabled:opacity-60 ${primaryCtaClass} ${focusRing("focus-visible:ring-offset-[#0B1A3A]")}`}
          >
            {pending ? "Verifying…" : "Use recovery code"}
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-white/60">
        {mode === "totp" ? (
          <>
            Lost your device?{" "}
            <button
              type="button"
              className="font-semibold text-[#C9A961] underline-offset-2 hover:underline"
              onClick={() => {
                setMode("recovery");
                setError("");
              }}
            >
              Use a recovery code
            </button>
          </>
        ) : (
          <button
            type="button"
            className="font-semibold text-[#C9A961] underline-offset-2 hover:underline"
            onClick={() => {
              setMode("totp");
              setError("");
            }}
          >
            Back to authenticator code
          </button>
        )}
      </p>

      <p className="mt-4 text-xs text-white/40">
        <Link href="/signin" className="underline-offset-2 hover:underline">
          Return to sign in
        </Link>
      </p>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <section className="mx-auto flex max-w-lg flex-col px-6 pb-24 pt-[160px]">
        <Suspense fallback={<p className="text-sm text-white/60">Loading…</p>}>
          <MfaChallengeForm />
        </Suspense>
      </section>
      <SiteFooter />
    </main>
  );
}
