// Walks QBO's nested Rows/ColData report structure into a flat row model.
// Returns: [{ account_name, values: [number|null, ...], is_subtotal, indent_level }]
export function walkQboReport(reportJson, valueColumnIndices = [1]) {
  const rows = [];
  const walk = (node, depth = 0) => {
    if (!node) return;
    const isSection = node.type === "Section";
    const isData = node.type === "Data";
    if (isData && node.ColData) {
      const name = node.ColData[0]?.value || "";
      const values = valueColumnIndices.map((idx) => {
        const raw = node.ColData[idx]?.value;
        if (raw === undefined || raw === "" || raw === null) return null;
        const num = parseFloat(String(raw).replace(/,/g, ""));
        return Number.isFinite(num) ? num : null;
      });
      rows.push({ account_name: name, values, is_subtotal: false, indent_level: depth });
    }
    if (Array.isArray(node.Rows?.Row)) {
      node.Rows.Row.forEach((child) => walk(child, isSection ? depth + 1 : depth));
    }
    if (isSection && node.Summary?.ColData) {
      const name = node.Summary.ColData[0]?.value || "";
      const values = valueColumnIndices.map((idx) => {
        const raw = node.Summary.ColData[idx]?.value;
        if (raw === undefined || raw === "" || raw === null) return null;
        const num = parseFloat(String(raw).replace(/,/g, ""));
        return Number.isFinite(num) ? num : null;
      });
      if (name) rows.push({ account_name: name, values, is_subtotal: true, indent_level: depth });
    }
  };
  (reportJson?.Rows?.Row || []).forEach((r) => walk(r, 0));
  return rows;
}

// Merge multiple period reports by account_name. Preserves order from primary.
// Each report array becomes a column. Missing accounts default to 0.
export function mergeReports(primary, ...others) {
  const merged = primary.map((row) => ({
    account_name: row.account_name,
    is_subtotal: row.is_subtotal,
    indent_level: row.indent_level,
    values: [row.values[0], ...others.map(() => 0)],
  }));
  others.forEach((otherRows, otherIdx) => {
    otherRows.forEach((otherRow) => {
      const existing = merged.find((m) => m.account_name === otherRow.account_name);
      if (existing) {
        existing.values[otherIdx + 1] = otherRow.values[0] ?? 0;
      } else {
        const values = new Array(1 + others.length).fill(0);
        values[otherIdx + 1] = otherRow.values[0] ?? 0;
        merged.push({
          account_name: otherRow.account_name,
          is_subtotal: otherRow.is_subtotal,
          indent_level: otherRow.indent_level,
          values,
        });
      }
    });
  });
  return merged;
}

// Compute % change between two values. Returns number, "new", or 0.
export function pctChange(current, prior) {
  if (prior === 0 || prior === null || prior === undefined) {
    if (current === 0 || current === null || current === undefined) return 0;
    return "new";
  }
  return ((current - prior) / Math.abs(prior)) * 100;
}

// Compute the prior period range for a current [start, end]. Same length, immediately preceding.
export function priorPeriodRange(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const days = Math.round((end - start) / 86400000) + 1;
  const priorEnd = new Date(start);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - (days - 1));
  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
  };
}

// Compute YoY range — same period one year earlier.
export function yoyPeriodRange(periodStart, periodEnd) {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  start.setFullYear(start.getFullYear() - 1);
  end.setFullYear(end.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
