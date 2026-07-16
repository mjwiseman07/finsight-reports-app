"use client";

import { useEffect, useMemo, useState } from "react";
import { focusRing } from "@/components/site-ui";

export function MfaRecoveryCodesModal({
  codes,
  onContinue,
}: {
  codes: string[];
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const canContinue = useMemo(
    () => confirmed && (elapsed >= 15 || copied || downloaded),
    [confirmed, elapsed, copied, downloaded],
  );

  const allText = codes.join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const downloadTxt = () => {
    const blob = new Blob(
      [
        "Advisacor MFA recovery codes\n",
        "Store these securely. Each code can be used once.\n\n",
        allText,
        "\n",
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "advisacor-mfa-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1A3A]/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-recovery-title"
        className="w-full max-w-lg rounded-3xl border border-[#E8E6E0] bg-white p-6 shadow-2xl shadow-black/10 sm:p-8"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">
          Recovery Codes
        </p>
        <h2
          id="mfa-recovery-title"
          className="mt-2 text-xl font-black tracking-tight text-[#0B1A3A]"
        >
          Save these recovery codes now
        </h2>
        <p className="mt-3 rounded-2xl border border-[#E9B0B6] bg-[#FDECEE] px-4 py-3 text-sm font-semibold text-[#74202B]">
          They will not be shown again. Each code can be used once if you lose
          your authenticator device.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 font-mono text-sm text-[#111112]">
          {codes.map((code) => (
            <li
              key={code}
              className="rounded-2xl border border-[#E8E6E0] bg-[#FAFAF7] px-4 py-3 text-center font-bold tracking-widest"
            >
              {code}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyAll()}
            className={`inline-flex items-center justify-center rounded-full border border-[#0B1A3A]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1A3A] transition-colors hover:border-[#0B1A3A]/50 hover:bg-[#F7F6F2] ${focusRing("rounded-full")}`}
          >
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={downloadTxt}
            className={`inline-flex items-center justify-center rounded-full border border-[#0B1A3A]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#0B1A3A] transition-colors hover:border-[#0B1A3A]/50 hover:bg-[#F7F6F2] ${focusRing("rounded-full")}`}
          >
            Download as .txt
          </button>
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-[#111112]">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[#E8E6E0] text-[#0B1A3A] focus:ring-[#C9A961]"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span className="font-semibold">I&apos;ve saved these codes</span>
        </label>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#0B1A3A] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0B1A3A]/40 transition-colors hover:bg-[#12244A] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing("rounded-full")}`}
        >
          {canContinue
            ? "I've saved these codes, continue"
            : `Continue available in ${Math.max(0, 15 - elapsed)}s (or after copy/download)`}
        </button>
      </div>
    </div>
  );
}
