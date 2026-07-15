"use client";

import { useEffect, useMemo, useState } from "react";
import { focusRing, primaryCtaClass } from "@/components/site-ui";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-recovery-title"
        className="w-full max-w-lg rounded-2xl border border-[#C9A961]/30 bg-white p-6 shadow-2xl"
      >
        <h2
          id="mfa-recovery-title"
          className="text-lg font-semibold text-[#0B1A3A]"
        >
          Save these recovery codes now
        </h2>
        <p className="mt-2 text-sm text-red-800">
          They will not be shown again. Each code can be used once if you lose
          your authenticator device.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 font-mono text-sm text-[#111112]">
          {codes.map((code) => (
            <li
              key={code}
              className="rounded-md border border-[#E8E6E0] bg-[#F7F6F2] px-3 py-2 text-center"
            >
              {code}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyAll()}
            className={`rounded-md border border-[#0B1A3A]/20 bg-white px-3 py-2 text-sm font-semibold text-[#0B1A3A] ${focusRing()}`}
          >
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={downloadTxt}
            className={`rounded-md border border-[#0B1A3A]/20 bg-white px-3 py-2 text-sm font-semibold text-[#0B1A3A] ${focusRing()}`}
          >
            Download as .txt
          </button>
        </div>

        <label className="mt-5 flex items-start gap-2 text-sm text-[#333]">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I&apos;ve saved these codes</span>
        </label>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className={`mt-4 w-full rounded-md px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${primaryCtaClass} ${focusRing()}`}
        >
          {canContinue
            ? "I've saved these codes, continue"
            : `Continue available in ${Math.max(0, 15 - elapsed)}s (or after copy/download)`}
        </button>
      </div>
    </div>
  );
}
