"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LockButton({ packetId, packetLocked, sectionStatuses = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (packetLocked) return null;

  const hasErrors = sectionStatuses.some((s) => s === "error");

  async function handleClick() {
    if (!window.confirm("Lock this packet? It cannot be edited after locking.")) return;
    setError("");
    setBusy(true);
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
      const res = await fetch(`/api/close-packets/${packetId}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Lock failed (${res.status})`);
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
        disabled={busy || hasErrors}
        title={hasErrors ? "Cannot lock — sections have errors" : undefined}
        className="w-full rounded-lg border border-[#C9A961]/60 px-4 py-2 text-sm font-semibold text-[#C9A961] transition-colors hover:bg-[#C9A961]/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Locking…" : "Lock Packet"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
