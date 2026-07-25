"use client";

import { useEffect, useState } from "react";
import type {
  KickoutRow,
  ResolutionStatus,
} from "@/lib/audit-ready/kickouts/list-kickouts";
import type {
  ResolutionCode,
  SimilarResolution,
} from "@/lib/audit-ready/memory/similar-resolutions";
import { focusRing, headingFont } from "@/components/site-ui";

const RESOLUTION_CODE_OPTIONS: Array<{
  value: ResolutionCode;
  label: string;
}> = [
  { value: "immaterial", label: "Immaterial — within tolerance, no action" },
  { value: "timing", label: "Timing — will clear next period" },
  { value: "reclass", label: "Reclass — journal entry needed" },
  { value: "true_error", label: "True error — investigate + fix" },
  { value: "other", label: "Other — see note" },
];

function resolutionCodeLabel(code: ResolutionCode): string {
  return (
    RESOLUTION_CODE_OPTIONS.find((option) => option.value === code)?.label ??
    code
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

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
  const [resolutionCode, setResolutionCode] = useState<ResolutionCode | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<SimilarResolution[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const missingKey =
      (row.source_type === "bs_summary_line" && !row.qbo_account_id) ||
      (row.source_type === "pbc_run" && !row.tie_out_kind);
    if (missingKey) {
      setSuggestions([]);
      return () => controller.abort();
    }

    const sourceKey =
      row.source_type === "bs_summary_line"
        ? { qbo_account_id: row.qbo_account_id }
        : { tie_out_kind: row.tie_out_kind };

    void fetch("/api/audit-ready/kickouts/similar-resolutions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        engagement_id: row.engagement_id,
        source_type: row.source_type,
        ...sourceKey,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { results?: SimilarResolution[] };
      })
      .then((body) => setSuggestions(body.results ?? []))
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }
        setSuggestions([]);
      });

    return () => controller.abort();
  }, [row]);

  const submit = async () => {
    if (note.trim().length === 0) {
      setError("Note is required");
      return;
    }
    if (
      (status === "resolved" || status === "escalated") &&
      resolutionCode === null
    ) {
      setError("Resolution disposition is required");
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
          resolution_code: resolutionCode,
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

        {suggestions.length > 0 && (
          <div className="mt-4 rounded-lg border border-[#C9A961]/30 bg-[#C9A961]/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span aria-hidden="true" className="text-[#C9A961]">
                🧠
              </span>
              <span className="text-sm font-medium text-[#C9A961]">
                Similar prior resolutions on this{" "}
                {row.source_type === "bs_summary_line"
                  ? "account"
                  : "workpaper"}{" "}
                ({suggestions.length})
              </span>
            </div>
            <ul className="space-y-3">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.investigationId}
                  className="border-t border-[#C9A961]/20 pt-2 first:border-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-[#7A7974]">
                        {formatDate(suggestion.investigatedAt)} —{" "}
                        {suggestion.resolutionCode
                          ? resolutionCodeLabel(suggestion.resolutionCode)
                          : "—"}
                      </div>
                      <div className="mt-1 text-sm text-[#ECEBE7]">
                        “{suggestion.note}”
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNote(suggestion.note);
                        if (suggestion.resolutionCode) {
                          setResolutionCode(suggestion.resolutionCode);
                        }
                      }}
                      className={`whitespace-nowrap text-xs text-[#C9A961] hover:underline ${focusRing()}`}
                    >
                      Copy to my resolution
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="investigation-resolution-code"
            className="block text-sm font-medium text-[#ECEBE7]"
          >
            Resolution disposition{" "}
            <span className="text-[#C9A961]">*</span>
          </label>
          <select
            id="investigation-resolution-code"
            value={resolutionCode ?? ""}
            onChange={(event) =>
              setResolutionCode(
                (event.target.value || null) as ResolutionCode | null,
              )
            }
            className={`mt-1 w-full rounded-md border border-[#C9A961]/30 bg-[#111112] px-3 py-2 text-sm text-[#ECEBE7] ${focusRing()}`}
          >
            <option value="">Select disposition…</option>
            {RESOLUTION_CODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#7A7974]">
            Required when saving as Resolved or Escalated. Helps Advisacor
            learn from your resolutions.
          </p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="investigation-note"
            className="block text-sm font-medium text-[#ECEBE7]"
          >
            Note
          </label>
          <textarea
            id="investigation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`mt-1 w-full rounded-md border border-[#C9A961]/30 bg-[#111112] px-3 py-2 text-sm text-[#ECEBE7] placeholder:text-[#7A7974] ${focusRing()}`}
            rows={4}
            placeholder="What did you find? What's the resolution plan?"
            autoFocus
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="investigation-resolution-status"
            className="block text-sm font-medium text-[#ECEBE7]"
          >
            Resolution status
          </label>
          <select
            id="investigation-resolution-status"
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
            disabled={
              submitting ||
              ((status === "resolved" || status === "escalated") &&
                resolutionCode === null)
            }
          >
            {submitting ? "Saving…" : "Save investigation"}
          </button>
        </div>
      </div>
    </div>
  );
}
