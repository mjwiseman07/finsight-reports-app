"use client";

import { useState } from "react";

export interface LineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  gl_account_code?: string;
}

export function LineItemEditor(props: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
}) {
  const [rows, setRows] = useState<LineItem[]>(props.lines);

  function update(i: number, patch: Partial<LineItem>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setRows(next);
    props.onChange(next);
  }

  function addRow() {
    const next = [...rows, { description: "", quantity: 1, unit_price_cents: 0 }];
    setRows(next);
    props.onChange(next);
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    setRows(next);
    props.onChange(next);
  }

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Description</th>
            <th className="text-right p-2">Qty</th>
            <th className="text-right p-2">Unit Price ($)</th>
            <th className="text-left p-2">GL Account</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">
                <input
                  className="w-full border rounded px-2 py-1"
                  value={r.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-24 border rounded px-2 py-1 text-right"
                  value={r.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                />
              </td>
              <td className="p-2 text-right">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32 border rounded px-2 py-1 text-right"
                  value={(r.unit_price_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    update(i, { unit_price_cents: Math.round(Number(e.target.value) * 100) })
                  }
                />
              </td>
              <td className="p-2">
                <input
                  className="w-40 border rounded px-2 py-1"
                  value={r.gl_account_code ?? ""}
                  onChange={(e) => update(i, { gl_account_code: e.target.value })}
                />
              </td>
              <td className="p-2">
                <button type="button" className="text-red-600 text-sm" onClick={() => removeRow(i)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="border rounded px-3 py-1 text-sm" onClick={addRow}>
        + Add Line
      </button>
    </div>
  );
}
