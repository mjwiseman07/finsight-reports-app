"use client";

import { useMemo, useState } from "react";
import type { BackupTabSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import { focusRing } from "@/components/site-ui";
import { sectionAccent } from "./theme";

function formatCell(
  value: string | number | null | undefined,
  format?: "currency" | "date" | "text" | "number",
): string {
  if (value == null || value === "") return "—";
  if (format === "currency" && typeof value === "number") {
    const dollars = value / 100;
    const sign = dollars < 0 ? "-" : "";
    return `${sign}$${Math.abs(dollars).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (format === "number" && typeof value === "number") {
    return value.toLocaleString("en-US");
  }
  return String(value);
}

export function ReconFaceBackupTabs({
  tabs,
  initialTabName = null,
  maxRowsPerTab,
}: {
  tabs: BackupTabSpec[];
  initialTabName?: string | null;
  maxRowsPerTab?: number;
}) {
  const resolveInitial = (name: string | null | undefined): string | null => {
    if (!name) return tabs[0]?.tabName ?? null;
    const exact = tabs.find((t) => t.tabName === name);
    if (exact) return exact.tabName;
    // BS summary emitter truncates Excel sheet names to 28 chars.
    const truncated = name.slice(0, 28);
    const prefix = tabs.find(
      (t) => t.tabName === truncated || name.startsWith(t.tabName),
    );
    return prefix?.tabName ?? tabs[0]?.tabName ?? null;
  };

  const [active, setActive] = useState<string | null>(() =>
    resolveInitial(initialTabName),
  );

  const tab = useMemo(
    () => tabs.find((t) => t.tabName === active) ?? tabs[0] ?? null,
    [tabs, active],
  );

  if (tabs.length === 0) {
    return (
      <p className="text-xs text-[#7A7974]">No backup tabs for this run.</p>
    );
  }

  const rows =
    maxRowsPerTab != null && tab
      ? tab.rows.slice(0, maxRowsPerTab)
      : (tab?.rows ?? []);
  const truncated =
    maxRowsPerTab != null && tab && tab.rows.length > maxRowsPerTab;

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-1 border-b border-[#C9A961]/20 pb-2"
        role="tablist"
      >
        {tabs.map((t, i) => {
          const isActive = t.tabName === (tab?.tabName ?? active);
          const accent = sectionAccent(i);
          return (
            <button
              key={t.tabName}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.tabName)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${focusRing()} ${
                isActive
                  ? "text-[#111112]"
                  : "bg-[#1A1A1C] text-[#A29E93] hover:text-[#ECEBE7]"
              }`}
              style={
                isActive
                  ? { backgroundColor: accent }
                  : { borderLeft: `2px solid ${accent}` }
              }
            >
              {t.tabName}
            </button>
          );
        })}
      </div>

      {tab && (
        <div className="overflow-x-auto rounded-lg border border-[#C9A961]/20">
          <table className="min-w-full text-xs">
            <thead className="bg-[#1A1A1C] text-[#7A7974]">
              <tr>
                {tab.columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-2 font-medium ${
                      c.format === "currency" || c.format === "number"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-t border-[#C9A961]/10 text-[#ECEBE7]"
                >
                  {tab.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-1.5 ${
                        c.format === "currency" || c.format === "number"
                          ? "text-right tabular-nums"
                          : "text-left"
                      }`}
                    >
                      {formatCell(row[c.key], c.format)}
                    </td>
                  ))}
                </tr>
              ))}
              {tab.subtotalRow && (
                <tr className="border-t border-[#C9A961]/30 bg-[#1A1A1C]/60 font-semibold text-[#ECEBE7]">
                  {tab.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-1.5 ${
                        c.format === "currency" || c.format === "number"
                          ? "text-right tabular-nums"
                          : "text-left"
                      }`}
                    >
                      {formatCell(tab.subtotalRow![c.key], c.format)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
          {truncated && (
            <p className="border-t border-[#C9A961]/20 px-3 py-2 text-xs text-[#7A7974]">
              Showing first {maxRowsPerTab} of {tab.rows.length} rows. Open the
              full workpaper for complete detail.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
