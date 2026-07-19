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

    try {
      const parsed = JSON.parse(result.content) as {
        classifications: { index: number; assertions: string[] }[];
      };
      for (const c of parsed.classifications ?? []) {
        const globalIdx = i + c.index;
        if (globalIdx >= 0 && globalIdx < requests.length) {
          results[globalIdx] = (c.assertions ?? []).filter((a): a is Assertion =>
            (ASSERTIONS as readonly string[]).includes(a),
          );
        }
      }
    } catch {
      // leave unclassified
    }
  }

  return results;
}
