"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { focusRing, headingFont } from "@/components/site-ui";

type PurgeRow = {
  id: string;
  firm_id: string;
  status: string;
  reason: string;
  scheduled_at: string;
  grace_until: string;
  firms?: { id: string; name: string } | null;
};

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("supabase_access_token") || ""
      : "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

export default function PurgeQueuePage() {
  const [rows, setRows] = useState<PurgeRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/purge-queue", { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || `http_${res.status}`);
      return;
    }
    setRows(data.rows ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    const res = await fetch(path, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || `http_${res.status}`);
    }
    await load();
    setBusy(null);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 text-[#ECEBE7]">
      <div className="flex items-center justify-between gap-4">
        <h1 className={`${headingFont} text-2xl font-semibold`}>Purge queue</h1>
        <Link href="/admin" className={`${focusRing()} text-sm text-[#C9A961] underline`}>
          Back to admin
        </Link>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[#C9A961]/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1A1A1C] text-[#A29E93]">
            <tr>
              <th className="px-3 py-2">Firm</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Grace until</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[#C9A961]/15">
                <td className="px-3 py-2">{row.firms?.name || row.firm_id}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.reason}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.scheduled_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.grace_until).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={busy === row.id}
                    className={`${focusRing()} rounded border border-[#C9A961]/30 px-2 py-1 text-xs`}
                    onClick={() =>
                      act("/api/admin/purge-queue/extend", { schedule_id: row.id, days: 30 }, row.id)
                    }
                  >
                    Extend grace
                  </button>
                  <button
                    type="button"
                    disabled={busy === row.id}
                    className={`${focusRing()} rounded border border-red-400/40 px-2 py-1 text-xs text-red-200`}
                    onClick={() =>
                      act("/api/admin/purge-queue/execute-now", { schedule_id: row.id }, row.id)
                    }
                  >
                    Execute now
                  </button>
                  <button
                    type="button"
                    disabled={busy === row.id}
                    className={`${focusRing()} rounded border border-[#C9A961]/30 px-2 py-1 text-xs`}
                    onClick={() =>
                      act(
                        "/api/admin/purge-queue/legal-hold",
                        { firm_id: row.firm_id, reason: "admin_legal_hold" },
                        row.id,
                      )
                    }
                  >
                    Legal hold
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[#A29E93]">
                  No pending purges.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
