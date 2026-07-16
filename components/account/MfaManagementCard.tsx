"use client";

import { useState, useTransition } from "react";
import {
  disableTotpFactor,
  regenerateRecoveryCodes,
} from "@/lib/mfa/actions";
import { focusRing } from "@/components/site-ui";
import { MfaRecoveryCodesModal } from "./MfaRecoveryCodesModal";

type FactorInfo = {
  id: string;
  friendlyName: string | null;
  createdAt: string;
};

export function MfaManagementCard({
  factor,
  isFirmAdmin,
  auditTail,
}: {
  factor: FactorInfo;
  isFirmAdmin: boolean;
  auditTail: Array<{ event_type: string; created_at: string }>;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabled, setDisabled] = useState(false);

  const onRegenerate = () => {
    setError("");
    startTransition(async () => {
      const result = await regenerateRecoveryCodes();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRecoveryCodes(result.data.recoveryCodes);
    });
  };

  const onDisable = () => {
    if (disableConfirm !== "DISABLE") return;
    setError("");
    startTransition(async () => {
      const result = await disableTotpFactor(factor.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowDisableModal(false);
      setDisabled(true);
    });
  };

  if (disabled) {
    return (
      <div className="rounded-3xl border border-[#E8E6E0] bg-[#FAFAF7] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
          MFA Disabled
        </p>
        <p className="mt-2 text-base font-black tracking-tight text-[#0B1A3A]">
          Two-factor authentication has been turned off.
        </p>
        <p className="mt-2 text-sm text-[#5C5A55]">
          Refresh the page to enroll again.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#B9D28F] bg-[#E6F0DA]/60 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#437A22] text-sm font-black text-white shadow-md shadow-[#437A22]/30"
        >
          ✓
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#2E5A15]">
            Enabled
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-[#2E5A15]">
            Two-factor authentication is on.
          </h2>
          <p className="mt-2 text-sm text-[#2E5A15]/85">
            Factor: {factor.friendlyName ?? "Authenticator"} · Enrolled{" "}
            {new Date(factor.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onRegenerate}
          className={`inline-flex items-center justify-center rounded-full border border-[#0B1A3A]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1A3A] transition-colors hover:border-[#0B1A3A]/50 hover:bg-[#F7F6F2] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing("rounded-full")}`}
        >
          Regenerate recovery codes
        </button>
        {!isFirmAdmin ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowDisableModal(true)}
            className={`inline-flex items-center justify-center rounded-full bg-[#A12C7B] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#A12C7B]/40 transition-colors hover:bg-[#8A2469] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing("rounded-full")}`}
          >
            Disable
          </button>
        ) : (
          <p className="self-center text-xs font-semibold text-[#5C5A55]">
            Firm administrators cannot disable MFA.
          </p>
        )}
      </div>

      {auditTail.length > 0 ? (
        <div className="mt-8 border-t border-[#B9D28F]/40 pt-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
            Recent MFA activity
          </p>
          <ul className="mt-3 grid gap-2">
            {auditTail.map((row) => (
              <li
                key={`${row.event_type}-${row.created_at}`}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#E8E6E0] bg-white px-4 py-3 text-sm"
              >
                <span className="font-semibold text-[#0B1A3A]">{row.event_type}</span>
                <span className="text-xs text-[#5C5A55]">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-4 rounded-2xl border border-[#E9B0B6] bg-[#FDECEE] px-4 py-3 text-sm font-semibold text-[#74202B]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {showDisableModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1A3A]/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-[#E8E6E0] bg-white p-6 shadow-2xl shadow-black/10 sm:p-8"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
              Confirm
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#0B1A3A]">
              Disable two-factor authentication?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#5C5A55]">
              This weakens your account security. Type{" "}
              <span className="rounded bg-[#F7F6F2] px-1.5 py-0.5 font-mono font-bold text-[#111112]">
                DISABLE
              </span>{" "}
              to confirm.
            </p>
            <input
              value={disableConfirm}
              onChange={(e) => setDisableConfirm(e.target.value)}
              className={`mt-5 w-full rounded-2xl border border-[#E8E6E0] bg-white px-4 py-3 font-mono text-sm text-[#111112] placeholder:text-[#A29E93] focus:border-[#A12C7B]/60 ${focusRing("rounded-2xl")}`}
              placeholder="DISABLE"
            />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableConfirm("");
                }}
                className={`inline-flex items-center justify-center rounded-full border border-[#E8E6E0] bg-white px-5 py-2.5 text-sm font-semibold text-[#5C5A55] transition-colors hover:border-[#0B1A3A]/40 hover:bg-[#F7F6F2] hover:text-[#0B1A3A] ${focusRing("rounded-full")}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || disableConfirm !== "DISABLE"}
                onClick={onDisable}
                className={`inline-flex items-center justify-center rounded-full bg-[#A12C7B] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#A12C7B]/40 transition-colors hover:bg-[#8A2469] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing("rounded-full")}`}
              >
                Disable MFA
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {recoveryCodes ? (
        <MfaRecoveryCodesModal
          codes={recoveryCodes}
          onContinue={() => setRecoveryCodes(null)}
        />
      ) : null}
    </div>
  );
}
