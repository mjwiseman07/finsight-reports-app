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
      <div className="rounded-xl border border-[#E8E6E0] bg-[#F7F6F2] p-5">
        <p className="font-semibold text-[#0B1A3A]">
          Two-factor authentication has been disabled.
        </p>
        <p className="mt-1 text-sm text-[#5C5A55]">
          Refresh the page to enroll again.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
        >
          ✓
        </span>
        <div>
          <h2 className="text-base font-semibold text-emerald-950">
            Two-factor authentication is enabled.
          </h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            Factor: {factor.friendlyName ?? "Authenticator"} · Enrolled{" "}
            {new Date(factor.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onRegenerate}
          className={`rounded-md border border-[#0B1A3A]/20 bg-white px-4 py-2 text-sm font-semibold text-[#0B1A3A] disabled:opacity-60 ${focusRing()}`}
        >
          Regenerate recovery codes
        </button>
        {!isFirmAdmin ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowDisableModal(true)}
            className={`rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60 ${focusRing()}`}
          >
            Disable
          </button>
        ) : (
          <p className="self-center text-xs text-[#5C5A55]">
            Firm administrators cannot disable MFA.
          </p>
        )}
      </div>

      {auditTail.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A961]">
            Recent MFA activity
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[#5C5A55]">
            {auditTail.map((row) => (
              <li key={`${row.event_type}-${row.created_at}`}>
                <span className="font-medium text-[#0B1A3A]">{row.event_type}</span>{" "}
                · {new Date(row.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {showDisableModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-[#0B1A3A]">
              Disable two-factor authentication?
            </h3>
            <p className="mt-2 text-sm text-[#5C5A55]">
              Are you sure? This weakens your account security. Type{" "}
              <span className="font-mono font-semibold">DISABLE</span> to
              confirm.
            </p>
            <input
              value={disableConfirm}
              onChange={(e) => setDisableConfirm(e.target.value)}
              className={`mt-4 w-full rounded-md border border-[#E8E6E0] px-3 py-2 font-mono ${focusRing()}`}
              placeholder="DISABLE"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableConfirm("");
                }}
                className={`rounded-md border border-[#0B1A3A]/20 px-3 py-2 text-sm font-semibold ${focusRing()}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || disableConfirm !== "DISABLE"}
                onClick={onDisable}
                className={`rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 ${focusRing()}`}
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
