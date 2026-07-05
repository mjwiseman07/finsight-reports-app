"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const AccentTeal = "#01696F";

export default function ManualTestDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [data, setData] = useState<{
    evidence: Record<string, unknown>;
    strengthContribution: string;
    attachments: Array<Record<string, unknown>>;
    ledgerEvents: Array<Record<string, unknown>>;
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const res = await fetch(`/api/reviewer/manual-tests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || "not_found");
      return;
    }
    setData(body);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!data) return <p className="text-slate-400">Loading…</p>;

  const ev = data.evidence;
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: AccentTeal }}>
        Manual test — {String(ev.accountCategory)} · {String(ev.assertionId)}
      </h1>
      <p className="text-sm text-slate-300">{String(ev.evidenceSummary)}</p>
      <p className="text-xs text-slate-400">
        Strength contribution: <strong>{data.strengthContribution}</strong> · type:{" "}
        {String(ev.evidenceType)}
      </p>
      {ev.resolvesGapItemId ? (
        <p className="text-sm">
          Resolves gap:{" "}
          <Link href={`/reviewer/gap-items/${String(ev.resolvesGapItemId)}`} className="underline">
            {String(ev.resolvesGapItemId)}
          </Link>
        </p>
      ) : null}
      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Attachments</h2>
        <ul className="text-sm space-y-1">
          {data.attachments.map((a) => (
            <li key={String(a.attachment_id)}>
              {String(a.original_filename)} ({String(a.byte_size)} bytes){" "}
              {a.signedUrl ? (
                <a href={String(a.signedUrl)} className="underline" target="_blank" rel="noreferrer">
                  Download
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Ledger events</h2>
        <ul className="text-xs text-slate-400 space-y-1">
          {data.ledgerEvents.map((e) => (
            <li key={String(e.event_id)}>
              {String(e.event_type)} · {String(e.created_at)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
