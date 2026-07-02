// Rule-based sentiment classifier for refund request messages.
// Returns an array of triggered flags. Empty array = neutral sentiment.
// NEVER exposed to the customer — used only to fire silent founder alerts.

import { SENTIMENT_TRIGGERS, UPSET_TRIGGERS } from './refund-config.js';

/**
 * Classify sentiment in a customer message.
 * @param {string} message - Raw customer message text
 * @returns {{flags: string[], severity: 'none'|'upset'|'critical', matchedTerms: string[]}}
 */
export function classifySentiment(message) {
  if (!message || typeof message !== 'string') {
    return { flags: [], severity: 'none', matchedTerms: [] };
  }

  const normalized = message.toLowerCase();
  const matchedTerms = [];
  const flags = new Set();
  let severity = 'none';

  for (const trigger of SENTIMENT_TRIGGERS) {
    if (normalized.includes(trigger.toLowerCase())) {
      matchedTerms.push(trigger);
      flags.add(mapTriggerToFlag(trigger));
      severity = 'critical';
    }
  }

  if (severity !== 'critical') {
    for (const trigger of UPSET_TRIGGERS) {
      if (normalized.includes(trigger.toLowerCase())) {
        matchedTerms.push(trigger);
        flags.add('upset');
        severity = 'upset';
      }
    }
  }

  return {
    flags: Array.from(flags),
    severity,
    matchedTerms,
  };
}

function mapTriggerToFlag(trigger) {
  const t = trigger.toLowerCase();
  if (t.includes('chargeback') || t.includes('charge back') || t === 'dispute') return 'chargeback_threat';
  if (t.includes('attorney') || t.includes('lawyer') || t.includes('legal') || t === 'sue') return 'legal_threat';
  if (t.includes('bbb') || t.includes('better business')) return 'bbb_threat';
  if (t.includes('attorney general') || t.includes('consumer protection')) return 'regulator_threat';
  if (
    t.includes('scam') ||
    t.includes('fraud') ||
    t.includes('ripoff') ||
    t.includes('rip off') ||
    t.includes('ripped off')
  ) {
    return 'fraud_accusation';
  }
  return 'flagged';
}
