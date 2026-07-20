import { describe, it, expect } from 'vitest';
import { applyClassificationsToRequests } from '@/lib/audit-ready/assertion-classifier';
import type { ParsedPbcRequest } from '@/lib/audit-ready/pbc-parser';

function makeReq(n: string, desc: string): ParsedPbcRequest {
  return {
    request_number: n,
    request_description: desc,
    assertion_tags: [],
  };
}

describe('applyClassificationsToRequests', () => {
  it('applies tags positionally', () => {
    const reqs = [makeReq('A-01', 'Bank recs'), makeReq('A-02', 'Statements')];
    applyClassificationsToRequests(reqs, [
      ['existence', 'accuracy'],
      ['completeness'],
    ]);
    expect(reqs[0].assertion_tags).toEqual(['existence', 'accuracy']);
    expect(reqs[1].assertion_tags).toEqual(['completeness']);
  });

  it('defaults to [] when classification missing', () => {
    const reqs = [makeReq('A-01', 'x'), makeReq('A-02', 'y')];
    applyClassificationsToRequests(reqs, [['existence']]);
    expect(reqs[0].assertion_tags).toEqual(['existence']);
    expect(reqs[1].assertion_tags).toEqual([]);
  });

  it('handles empty inputs', () => {
    const reqs: ParsedPbcRequest[] = [];
    applyClassificationsToRequests(reqs, []);
    expect(reqs).toEqual([]);
  });
});
