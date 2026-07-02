"use client";

import { useCallback, useEffect, useState } from "react";

function authHeaders() {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
  return { Authorization: `Bearer ${token}` };
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function ShareLinksPanel({ packetId }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/close-packets/${packetId}/share-tokens`, {
        headers: authHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setTokens(json.tokens || []);
    } finally {
      setLoading(false);
    }
  }, [packetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createLink() {
    setCreating(true);
    setErr("");
    setNewUrl("");
    setCopied(false);
    try {
      const res = await fetch(`/api/close-packets/${packetId}/share-tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setNewUrl(json.share_url || "");
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(tokenId) {
    if (!window.confirm("Revoke this share link? Anyone using it will lose access.")) return;
    try {
      const res = await fetch(`/api/close-packets/${packetId}/share-tokens/${tokenId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) await load();
    } catch {
      /* no-op */
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(newUrl);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  }

  const active = tokens.filter((t) => !t.revoked_at);

  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Share links</div>

      <button
        type="button"
        onClick={createLink}
        disabled={creating}
        className="w-full rounded-lg border border-[#C9A961]/60 px-4 py-2 text-sm font-medium text-[#C9A961] transition-colors hover:bg-[#C9A961]/10 disabled:opacity-50"
      >
        {creating ? "Creating…" : "Create share link"}
      </button>
      {err && <div className="mt-2 text-xs text-red-400">{err}</div>}

      {newUrl && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2">
          <div className="mb-1 text-[11px] text-white/40">Copy now — shown once</div>
          <input
            readOnly
            value={newUrl}
            onFocus={(e) => e.target.select()}
            className="w-full rounded bg-transparent text-xs text-white/80 outline-none"
          />
          <button
            type="button"
            onClick={copyUrl}
            className="mt-1 text-xs text-[#C9A961] hover:underline"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {loading && <li className="text-xs text-white/40">Loading…</li>}
        {!loading && active.length === 0 && (
          <li className="text-xs text-white/40">No active links.</li>
        )}
        {active.map((t) => (
          <li key={t.id} className="rounded-lg border border-white/5 bg-white/5 p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/70">{t.label || "Link"}</span>
              <button
                type="button"
                onClick={() => revoke(t.id)}
                className="text-red-400 hover:underline"
              >
                Revoke
              </button>
            </div>
            <div className="mt-1 text-white/40">
              Expires {fmtDate(t.expires_at)} · {t.access_count ?? 0} views
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
