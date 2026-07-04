/** Exported for unit tests — dollar input to integer cents. */
export function parseDollarsToCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

export function draftBalanceCents(lines: Array<{ drAmountCents: number; crAmountCents: number }>) {
  const dr = lines.reduce((s, l) => s + l.drAmountCents, 0);
  const cr = lines.reduce((s, l) => s + l.crAmountCents, 0);
  return { dr, cr, balanced: dr === cr };
}
