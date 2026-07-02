/** Deterministic negative-reaction detector for Path C silent escalation. No LLM. */

const NEGATIVE_TERMS = Object.freeze([
  'unacceptable',
  'ridiculous',
  'scam',
  'fraud',
  'sue',
  'lawyer',
  'attorney',
  'bbb',
  'chargeback',
  'dispute',
  'angry',
  'upset',
  'furious',
  'outrageous',
]);

const ALL_CAPS_SEQUENCE = /[A-Z]{4,}/;

export function isNegativeReaction(message: string): boolean {
  const text = String(message || '').trim();
  if (!text) return false;

  const lower = text.toLowerCase();
  if (NEGATIVE_TERMS.some((term) => lower.includes(term))) {
    return true;
  }

  return ALL_CAPS_SEQUENCE.test(text);
}
