"use client";

import { useState } from "react";
import type {
  KickoutRow,
  ResolutionStatus,
} from "@/lib/audit-ready/kickouts/list-kickouts";
import { focusRing, headingFont } from "@/components/site-ui";

export function InvestigationModal({
  row,
  onClose,
  onSuccess,
}: {
  row: KickoutRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ResolutionStatus>("pending");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (note.trim().length === 0) {
      setError("Note is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-ready/kickouts/investigations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          engagement_id: row.engagement_id,
          kickout_source_type: row.source_type,
          kickout_source_id: row.source_id,
          note: note.trim(),
          resolution_status: status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save investigation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111112]/70"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="investigation-modal-title"
      >
        <h2
          id="investigation-modal-title"
          className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}
        >
          Mark investigated
        </h2>
        <p className="mt-1 text-sm text-[#A29E93]">
          {row.account_or_kind} · {row.engagement_name} · {row.period_end}
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#ECEBE7]">
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`mt-1 w-full rounded-md border border-[#C9A961]/30 bg-[#111112] px-3 py-2 text-sm text-[#ECEBE7] placeholder:text-[#7A7974] ${focusRing()}`}
            rows={4}
            placeholder="What did you find? What's the resolution plan?"
            autoFocus
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#ECEBE7]">
            Resolution status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ResolutionStatus)}
            className={`mt-1 w-full rounded-md border border-[#C9A961]/30 bg-[#111112] px-3 py-2 text-sm text-[#ECEBE7] ${focusRing()}`}
          >
            <option value="pending">Pending — still working</option>
            <option value="resolved">Resolved — no further action</option>
            <option value="escalated">Escalated — needs CPA</option>
          </select>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={`rounded border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-sm font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 ${focusRing()}`}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rounded bg-[#C9A961] px-3 py-1.5 text-sm font-medium text-[#111112] hover:bg-[#DFC084] disabled:opacity-50 ${focusRing()}`}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save investigation"}
          </button>
        </div>
      </div>
    </div>
  );
}
