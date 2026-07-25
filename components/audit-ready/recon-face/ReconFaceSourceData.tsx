"use client";

import { useState } from "react";
import { focusRing } from "@/components/site-ui";

export function ReconFaceSourceData({
  sourceData,
}: {
  sourceData: {
    qboRealmId: string;
    qboConnectionId: string;
    apiResponseJson: unknown;
    fetchedAt: string;
  };
}) {
  const [open, setOpen] = useState(false);
  let pretty = "";
  try {
    pretty = JSON.stringify(sourceData.apiResponseJson, null, 2);
  } catch {
    pretty = String(sourceData.apiResponseJson);
  }

  return (
    <div className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/40">
      <button
        type="button"
        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[#ECEBE7] ${focusRing()}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{open ? "Hide raw QBO response" : "Show raw QBO response"}</span>
        <span className="text-xs text-[#7A7974]">
          Fetched {sourceData.fetchedAt}
          {sourceData.qboRealmId ? ` · realm ${sourceData.qboRealmId}` : ""}
        </span>
      </button>
      {open && (
        <pre className="max-h-96 overflow-auto border-t border-[#C9A961]/20 bg-[#111112] p-4 text-xs text-[#A29E93]">
          {pretty || "(empty)"}
        </pre>
      )}
    </div>
  );
}
