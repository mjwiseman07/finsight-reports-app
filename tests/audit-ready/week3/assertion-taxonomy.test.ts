import { describe, it, expect } from 'vitest';
import {
  ASSERTIONS,
  ASSERTION_METADATA,
} from '@/lib/audit-ready/assertion-taxonomy';

describe('assertion-taxonomy', () => {
  it('exposes exactly six assertions', () => {
    expect(ASSERTIONS).toHaveLength(6);
  });

  it('every assertion has metadata', () => {
    for (const a of ASSERTIONS) {
      expect(ASSERTION_METADATA[a]).toBeDefined();
      expect(ASSERTION_METADATA[a].label.length).toBeGreaterThan(0);
      expect(ASSERTION_METADATA[a].typical_pbc_signals.length).toBeGreaterThan(0);
    }
  });

  it('includes the six PCAOB assertions by key', () => {
    expect(ASSERTIONS).toEqual([
      'existence',
      'completeness',
      'accuracy',
      'valuation',
      'rights_obligations',
      'presentation_disclosure',
    ]);
  });
});
