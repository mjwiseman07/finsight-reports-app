"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegenerateButton({ closePeriodId, packetLocked, label = "Regenerate" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (packetLocked) return null;

  async function handleClick() {
    if (!window.confirm("Regenerate all sections? Manual edits will be overwritten.")) return;
    setError("");
    setBusy(true);
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
      const res = await fetch(`/api/close-periods/${closePeriodId}/packet/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Regeneration failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A961] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#B8975A] disabled:opacity-60"
      >
        {busy && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/40 border-t-black" />
        )}
        {busy ? "Generating…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
