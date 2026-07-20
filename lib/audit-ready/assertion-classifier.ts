import { invokeBedrock } from './bedrock-client';
import { checkEngagementCap, logUsage } from './llm-usage';
import {
  ASSERTIONS,
  ASSERTION_METADATA,
  type Assertion,
} from './assertion-taxonomy';
import type { ParsedPbcRequest } from './pbc-parser';

/**
 * Classify each PBC request against 1+ of the six assertions.
 * Batched: up to 20 requests per Bedrock call to amortize prompt overhead.
 */
export async function classifyAssertions(
  requests: ParsedPbcRequest[],
  engagementId: string,
  calledByUserId: string,
): Promise<string[][]> {
  const results: string[][] = new Array(requests.length).fill(null).map(() => []);
  const BATCH_SIZE = 20;
  const taxonomyPrompt = ASSERTIONS.map(
    (a) =>
      `- ${a}: ${ASSERTION_METADATA[a].label} — ${ASSERTION_METADATA[a].short_definition} Signals: ${ASSERTION_METADATA[a].typical_pbc_signals.join(', ')}`,
  ).join('\n');

  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const cap = await checkEngagementCap(engagementId, 'sonnet');
    if (!cap.allowed) break;

    const result = await invokeBedrock({
      model: cap.modelToUse,
      systemPrompt:
        'You classify audit PBC requests against the six financial-statement assertions per PCAOB AS 2401 / ISA 315. ' +
        'Return JSON: { "classifications": [{ "index": <0-based>, "assertions": ["existence","completeness",...] }] }. ' +
        'Assign 1-3 assertions per request. Every request MUST get at least 1 assertion. ' +
        'Valid assertion keys ONLY:\n' +
        taxonomyPrompt,
      userPrompt:
        `Classify these ${batch.length} PBC requests:\n\n` +
        batch
          .map((r, idx) => `[${idx}] ${r.request_number}: ${r.request_description}`)
          .join('\n\n'),
      maxTokens: 2048,
      temperature: 0,
    });

    await logUsage(
      { engagementId, operation: 'assertion_classify', calledByUserId },
      result,
      cap.modelToUse,
      true,
    );

    // Sonnet frequently wraps JSON in ```json fences or emits leading prose.
    // Mirror the extraction pattern used in pbc-parser.ts: try direct parse,
    // then fall back to greedy-match on the first {...} block. Log on failure
    // instead of silently dropping — an empty classification set means every
    // downstream consumer (parity, tie-out priority, auditor filters) sees
    // untagged requests and we lose $0.03 of Bedrock spend per parse.
    let parsed: {
      classifications: { index: number; assertions: string[] }[];
    } | null = null;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed) {
      console.error('[assertion-classifier] JSON parse failed', {
        engagementId,
        batchStart: i,
        batchSize: batch.length,
        contentPreview: result.content.slice(0, 500),
      });
      continue;
    }
    for (const c of parsed.classifications ?? []) {
      const globalIdx = i + c.index;
      if (globalIdx >= 0 && globalIdx < requests.length) {
        const filtered = (c.assertions ?? []).filter((a): a is Assertion =>
          (ASSERTIONS as readonly string[]).includes(a),
        );
        if (filtered.length === 0 && (c.assertions ?? []).length > 0) {
          console.warn('[assertion-classifier] all tags filtered out', {
            engagementId,
            requestNumber: requests[globalIdx]?.request_number,
            rawTags: c.assertions,
          });
        }
        results[globalIdx] = filtered;
      }
    }
  }

  return results;
}

/**
 * Given already-classified tag arrays and a list of requests, apply the tags
 * to each request in place. Extracted so unit tests can verify tag-application
 * without hitting Bedrock.
 */
export function applyClassificationsToRequests(
  requests: ParsedPbcRequest[],
  classifications: string[][],
): void {
  for (let i = 0; i < requests.length; i++) {
    requests[i].assertion_tags = classifications[i] ?? [];
  }
}
