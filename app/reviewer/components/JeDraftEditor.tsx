"use client";

import type { JEDraft, JEDraftLine } from "@/lib/pre-close/types";
import { parseDollarsToCents } from "@/lib/reviewer/je-draft-utils";

type Props = {
  firmClientId: string;
  draft: JEDraft;
  onChange: (draft: JEDraft) => void;
};

export function JeDraftEditor({ firmClientId, draft, onChange }: Props) {
  const totalDr = draft.lines.reduce((s, l) => s + l.drAmountCents, 0);
  const totalCr = draft.lines.reduce((s, l) => s + l.crAmountCents, 0);
  const balanced = totalDr === totalCr;

  function updateLine(idx: number, patch: Partial<JEDraftLine>) {
    const lines = draft.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    onChange({ ...draft, lines });
  }

  function addLine() {
    const next: JEDraftLine = {
      lineIndex: draft.lines.length,
      accountId: "",
      accountName: "",
      drAmountCents: 0,
      crAmountCents: 0,
      memo: "",
    };
    onChange({ ...draft, lines: [...draft.lines, next] });
  }

  function removeLine(idx: number) {
    const lines = draft.lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineIndex: i }));
    onChange({ ...draft, lines });
  }

  async function autocompleteAccount(idx: number) {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const res = await fetch(`/api/reviewer/qbo-accounts?firmClientId=${firmClientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const first = data.accounts?.[0];
    if (first) updateLine(idx, { accountId: first.id, accountName: first.name });
  }

  return (
    <div className="border border-white/10 rounded p-3 mb-3 text-xs">
      <p className="font-medium mb-2">Edit JE draft</p>
      {draft.lines.map((line, idx) => (
        <div key={line.lineIndex} className="grid grid-cols-6 gap-1 mb-2">
          <input
            className="bg-black/30 px-1 rounded"
            value={line.accountId}
            onChange={(e) => updateLine(idx, { accountId: e.target.value })}
            placeholder="Acct"
          />
          <input
            className="bg-black/30 px-1 rounded col-span-2"
            value={line.accountName}
            onChange={(e) => updateLine(idx, { accountName: e.target.value })}
            placeholder="Name"
          />
          <input
            className="bg-black/30 px-1 rounded"
            defaultValue={(line.drAmountCents / 100).toFixed(2)}
            onBlur={(e) => updateLine(idx, { drAmountCents: parseDollarsToCents(e.target.value) })}
            placeholder="DR"
          />
          <input
            className="bg-black/30 px-1 rounded"
            defaultValue={(line.crAmountCents / 100).toFixed(2)}
            onBlur={(e) => updateLine(idx, { crAmountCents: parseDollarsToCents(e.target.value) })}
            placeholder="CR"
          />
          <div className="flex gap-1">
            <button type="button" onClick={() => autocompleteAccount(idx)}>
              QBO
            </button>
            <button type="button" onClick={() => removeLine(idx)}>
              ×
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addLine} className="underline mb-2">
        + Add line
      </button>
      <textarea
        className="w-full bg-black/30 rounded px-2 py-1 mb-2"
        value={draft.narration}
        onChange={(e) => onChange({ ...draft, narration: e.target.value })}
        placeholder="Narration"
      />
      <input
        type="date"
        className="bg-black/30 rounded px-2 py-1"
        value={draft.transactionDate}
        onChange={(e) => onChange({ ...draft, transactionDate: e.target.value })}
      />
      <p className={balanced ? "text-emerald-300 mt-2" : "text-red-300 mt-2"}>
        Balance: DR {(totalDr / 100).toFixed(2)} — CR {(totalCr / 100).toFixed(2)}
      </p>
    </div>
  );
}
