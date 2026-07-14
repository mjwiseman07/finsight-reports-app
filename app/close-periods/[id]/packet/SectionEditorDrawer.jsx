"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { headingFont } from "@/components/site-ui";

export default function SectionEditorDrawer({ packetId, section, open, onClose }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (section) {
      setText(JSON.stringify(section.content_json ?? {}, null, 2));
      setParseError("");
      setSaveError("");
    }
  }, [section]);

  if (!open || !section) return null;

  async function handleSave() {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setParseError(`Invalid JSON: ${err.message}`);
      return;
    }
    setParseError("");
    setSaveError("");
    setSaving(true);
    try {
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
      const res = await fetch(`/api/close-packets/${packetId}/sections/${section.section_key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payload_json: parsed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(json.error || `Save failed (${res.status})`);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-[640px] flex-col border-l border-white/10 bg-[#1A1A1C] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className={`${headingFont} text-lg text-white`}>Edit section: {section.section_key}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-[480px] w-full resize-y rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-sm text-white/90 focus:border-[#C9A961] focus:outline-none"
          />
          {parseError && <p className="mt-2 text-sm text-red-400">{parseError}</p>}
          {saveError && <p className="mt-2 text-sm text-red-400">{saveError}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#C9A961] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#B8975A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
