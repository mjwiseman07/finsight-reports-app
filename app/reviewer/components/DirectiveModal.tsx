"use client";

import { useState } from "react";
import type { JEDraft } from "@/lib/pre-close/types";
import { JeDraftEditor } from "./JeDraftEditor";

const REASON_CODES = ["standard_approval", "policy_exception", "client_request", "materiality", "other"];

type Props = {
  reviewItemId: string;
  firmClientId: string;
  initialDraft: JEDraft;
  onClose: () => void;
  onApplied: () => void;
};

export function DirectiveModal({ reviewItemId, firmClientId, initialDraft, onClose, onApplied }: Props) {
  const [decision, setDecision] = useState<"approved" | "edit_and_approved" | "rejected" | "deferred">(
    "approved",
  );
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]);
  const [reasonText, setReasonText] = useState("");
  const [editedDraft, setEditedDraft] = useState<JEDraft>(initialDraft);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    if (decision === "edit_and_approved") {
      const dr = editedDraft.lines.reduce((s, l) => s + l.drAmountCents, 0);
      const cr = editedDraft.lines.reduce((s, l) => s + l.crAmountCents, 0);
      if (dr !== cr) {
        setError("Edited draft must balance");
        return;
      }
    }
    setSubmitting(true);
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const body: Record<string, unknown> = {
      decision,
      decisionReasonCode: reasonCode,
      decisionReasonText: reasonText,
    };
    if (decision === "edit_and_approved") body.editedJeDraft = editedDraft;
    const res = await fetch(`/api/reviewer/review/${reviewItemId}/decide`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "mfa_step_up_required") {
        setError(
          "Fresh MFA required for this materiality tier. Open Security & 2FA on the dashboard, verify, then retry.",
        );
        return;
      }
      if (data.error === "sod_violation_same_user") {
        setError("Segregation of duties: you cannot approve a JE you proposed.");
        return;
      }
      setError(data.error || "submit_failed");
      return;
    }
    onApplied();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-medium mb-4">Apply directive</h2>
        <div className="space-y-2 mb-4">
          {(["approved", "edit_and_approved", "rejected", "deferred"] as const).map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="decision"
                checked={decision === d}
                onChange={() => setDecision(d)}
              />
              {d}
            </label>
          ))}
        </div>
        <label className="block text-sm mb-1">Reason code</label>
        <select
          className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mb-3"
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
        >
          {REASON_CODES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="block text-sm mb-1">Reason text</label>
        <textarea
          className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mb-3 min-h-[60px]"
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
        />
        {decision === "edit_and_approved" ? (
          <JeDraftEditor
            firmClientId={firmClientId}
            draft={editedDraft}
            onChange={setEditedDraft}
          />
        ) : null}
        {error ? <p className="text-red-300 text-sm mb-2">{error}</p> : null}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} disabled={submitting} className="px-3 py-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-4 py-1 bg-teal-800 rounded disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
