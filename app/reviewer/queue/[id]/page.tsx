"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReviewItemDetail } from "@/lib/pre-close/reviewer-types";
import { DirectiveModal } from "../../components/DirectiveModal";

export default function ReviewItemDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [detail, setDetail] = useState<ReviewItemDetail | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isWriter, setIsWriter] = useState(false);

  const load = useCallback(async () => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const [detailRes, meRes] = await Promise.all([
      fetch(`/api/reviewer/review/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/reviewer/me", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const data = await detailRes.json();
    if (!detailRes.ok) {
      setError(data.error || "not_found");
      return;
    }
    setDetail(data);
    const me = await meRes.json();
    setIsWriter((me.writerFirmIds ?? []).length > 0);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function postNow() {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    await fetch(`/api/reviewer/review/${id}/post-now`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ overridePolicy: true }),
    });
    await load();
  }

  if (error) return <p className="text-red-300">{error}</p>;
  if (!detail) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-teal-200">
            {detail.ruleId} — {detail.severity}
          </h1>
          <p className="text-slate-400 text-sm">
            {detail.firmClientName} · {detail.engagementName}
          </p>
        </div>
        <button
          type="button"
          className="px-3 py-1 bg-white/10 rounded text-sm"
          onClick={() => window.open(`/api/reviewer/review/${id}/packet?persist=true`, "_blank")}
        >
          Export packet
        </button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Evidence</h2>
        <pre className="text-xs bg-black/30 p-3 rounded overflow-auto max-h-48">
          {JSON.stringify(detail.evidenceRefs, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">JE draft</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400">
              <th>Account</th>
              <th>Name</th>
              <th className="text-right">DR</th>
              <th className="text-right">CR</th>
            </tr>
          </thead>
          <tbody>
            {detail.jeDraft.lines.map((l) => (
              <tr key={l.lineIndex}>
                <td>{l.accountId}</td>
                <td>{l.accountName}</td>
                <td className="text-right">{(l.drAmountCents / 100).toFixed(2)}</td>
                <td className="text-right">{(l.crAmountCents / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Directive</h2>
        {detail.decision ? (
          <p>
            {detail.decision} — {detail.decisionReasonCode} — {detail.decisionAt}
          </p>
        ) : isWriter ? (
          <button
            type="button"
            className="px-4 py-2 bg-teal-800 rounded"
            onClick={() => setModalOpen(true)}
          >
            Decide
          </button>
        ) : (
          <p className="text-slate-400">Pending review</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Posting</h2>
        {detail.postedJeAttemptId ? (
          <p className="text-emerald-300">
            Posted — attempt {detail.postedJeAttemptId}
            {detail.qboJeId ? ` · QBO ${detail.qboJeId}` : ""}
          </p>
        ) : detail.postBlockReason ? (
          <div>
            <p className="text-amber-200">Blocked: {detail.postBlockReason}</p>
            {isWriter && detail.decision ? (
              <button type="button" className="mt-2 underline" onClick={postNow}>
                Post now (override policy)
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-400">Not yet posted</p>
        )}
      </section>

      {modalOpen && detail ? (
        <DirectiveModal
          reviewItemId={detail.id}
          firmClientId={detail.firmClientId}
          initialDraft={detail.jeDraft}
          onClose={() => setModalOpen(false)}
          onApplied={() => {
            setModalOpen(false);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
