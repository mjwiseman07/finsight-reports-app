"use client";

import { useState } from "react";

export default function DownloadPdfButton({ packetId, hasPdf }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [generated, setGenerated] = useState(hasPdf);

  async function handleClick() {
    setBusy(true);
    setErr(null);
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
      // Existing PDF → cheap GET for a fresh signed URL. Otherwise render (POST).
      const method = generated ? "GET" : "POST";
      const res = await fetch(`/api/close-packets/${packetId}/pdf`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setGenerated(true);
      window.open(json.signed_url, "_blank", "noopener");
    } catch (e) {
      setErr(e.message);
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
        className="w-full rounded-lg bg-[#C9A961] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#d8b972] disabled:opacity-50"
      >
        {busy ? "Generating…" : generated ? "Download PDF" : "Generate PDF"}
      </button>
      {err && <div className="mt-2 text-xs text-red-400">{err}</div>}
    </div>
  );
}
