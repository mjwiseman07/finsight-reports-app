"use client";

import { useState, useTransition } from "react";
import {
  enrollTotpFactor,
  verifyTotpEnrollment,
} from "@/lib/mfa/actions";
import { focusRing } from "@/components/site-ui";
import { MfaRecoveryCodesModal } from "./MfaRecoveryCodesModal";

type Step = "idle" | "scan" | "codes" | "done";

export function MfaEnrollmentCard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [copiedSecret, setCopiedSecret] = useState(false);

  const startEnroll = () => {
    setError("");
    startTransition(async () => {
      const result = await enrollTotpFactor();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFactorId(result.data.factorId);
      setQrCode(result.data.qrCode);
      setSecret(result.data.secret);
      setStep("scan");
    });
  };

  const verify = () => {
    setError("");
    startTransition(async () => {
      const result = await verifyTotpEnrollment(factorId, code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRecoveryCodes(result.data.recoveryCodes);
      setStep("codes");
    });
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
    } catch {
      setCopiedSecret(false);
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-3xl border border-[#B9D28F] bg-[#E6F0DA] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2E5A15]">
          Enabled
        </p>
        <p className="mt-2 text-base font-black tracking-tight text-[#2E5A15]">
          Two-factor authentication is on.
        </p>
        <p className="mt-2 text-sm leading-6 text-[#2E5A15]/85">
          You will be prompted for an authenticator code on your next sign-in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#E8E6E0] bg-[#FAFAF7] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
        Two-Factor Authentication
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-[#0B1A3A]">
        Protect your Advisacor account
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#5C5A55]">
        Add a time-based one-time password (TOTP) from Google Authenticator,
        Authy, or 1Password. Sign-ins will require a 6-digit code from your
        authenticator app.
      </p>

      {step === "idle" && (
        <button
          type="button"
          disabled={pending}
          onClick={startEnroll}
          className={`mt-5 inline-flex items-center justify-center rounded-full bg-[#0B1A3A] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing("rounded-full")}`}
        >
          {pending ? "Starting…" : "Enable Two-Factor Authentication"}
        </button>
      )}

      {step === "scan" && (
        <div className="mt-5 space-y-4">
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="TOTP QR code"
              className="h-48 w-48 rounded-2xl border border-[#E8E6E0] bg-white p-3"
            />
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
              Manual secret
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-2xl border border-[#E8E6E0] bg-white px-4 py-2.5 font-mono text-sm font-bold text-[#111112]">
                {secret}
              </code>
              <button
                type="button"
                onClick={() => void copySecret()}
                className={`inline-flex items-center justify-center rounded-full border border-[#0B1A3A]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0B1A3A] transition-colors hover:border-[#0B1A3A]/50 hover:bg-[#F7F6F2] ${focusRing("rounded-full")}`}
              >
                {copiedSecret ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
              6-digit code
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`rounded-2xl border border-[#E8E6E0] bg-white px-4 py-3 font-mono text-lg font-bold tracking-[0.3em] text-[#111112] focus:border-[#0B1A3A]/60 ${focusRing("rounded-2xl")}`}
              placeholder="000000"
            />
          </label>
          <button
            type="button"
            disabled={pending || code.length !== 6}
            onClick={verify}
            className={`inline-flex items-center justify-center rounded-full bg-[#0B1A3A] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing("rounded-full")}`}
          >
            {pending ? "Verifying…" : "Verify and enable"}
          </button>
        </div>
      )}

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-[#E9B0B6] bg-[#FDECEE] px-4 py-3 text-sm font-semibold text-[#74202B]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {step === "codes" && recoveryCodes.length > 0 ? (
        <MfaRecoveryCodesModal
          codes={recoveryCodes}
          onContinue={() => {
            setStep("done");
            onComplete?.();
          }}
        />
      ) : null}
    </div>
  );
}
