"use client";

import { useState, useTransition } from "react";
import {
  enrollTotpFactor,
  verifyTotpEnrollment,
} from "@/lib/mfa/actions";
import { focusRing, primaryCtaClass } from "@/components/site-ui";
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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-900">
          Two-factor authentication is enabled.
        </p>
        <p className="mt-1 text-sm text-emerald-800/90">
          You will be prompted for an authenticator code on your next sign-in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8E6E0] bg-[#F7F6F2] p-5">
      <h2 className="text-base font-semibold text-[#0B1A3A]">
        Two-factor authentication
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#5C5A55]">
        Protect your Advisacor account with a time-based one-time password
        (TOTP) from Google Authenticator, Authy, or 1Password.
      </p>

      {step === "idle" && (
        <button
          type="button"
          disabled={pending}
          onClick={startEnroll}
          className={`mt-4 rounded-md px-4 py-2.5 text-sm disabled:opacity-60 ${primaryCtaClass} ${focusRing()}`}
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
              className="h-48 w-48 rounded-lg border border-[#E8E6E0] bg-white p-2"
            />
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
              Manual secret
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-white px-3 py-2 font-mono text-sm text-[#111112]">
                {secret}
              </code>
              <button
                type="button"
                onClick={() => void copySecret()}
                className={`rounded-md border border-[#0B1A3A]/20 bg-white px-3 py-2 text-sm font-semibold ${focusRing()}`}
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
              className={`rounded-md border border-[#E8E6E0] bg-white px-3 py-2 font-mono text-lg tracking-[0.3em] text-[#111112] ${focusRing()}`}
              placeholder="000000"
            />
          </label>
          <button
            type="button"
            disabled={pending || code.length !== 6}
            onClick={verify}
            className={`rounded-md px-4 py-2.5 text-sm disabled:opacity-60 ${primaryCtaClass} ${focusRing()}`}
          >
            {pending ? "Verifying…" : "Verify and enable"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
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
