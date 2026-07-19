import crypto from 'node:crypto';
import { invokeBedrock } from './bedrock-client';

export type PiiCategory =
  | 'person_name'
  | 'ssn'
  | 'ein'
  | 'address'
  | 'phone'
  | 'email'
  | 'dob'
  | 'account_number'
  | 'routing_number'
  | 'credit_card';

export interface PiiEntity {
  category: PiiCategory;
  original: string;
  placeholder: string;
  startOffset: number;
  endOffset: number;
}

export interface RedactionResult {
  redacted: string;
  entities: PiiEntity[];
  mapHash: string;
}

const REGEX_PATTERNS: Array<{ category: PiiCategory; pattern: RegExp }> = [
  { category: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { category: 'ein', pattern: /\b\d{2}-\d{7}\b/g },
  { category: 'email', pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  {
    category: 'phone',
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },
  {
    category: 'credit_card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  },
  {
    category: 'account_number',
    pattern: /\b(?:account|acct)[\s#:]*(\d{6,17})\b/gi,
  },
];

/**
 * Runs regex pass first (deterministic, cheap), then optionally
 * a Bedrock Haiku NER pass for unstructured PII (person names, addresses).
 */
export async function redactPii(
  input: string,
  opts: { runNer: boolean } = { runNer: true },
): Promise<RedactionResult> {
  const entities: PiiEntity[] = [];
  const counters: Partial<Record<PiiCategory, number>> = {};
  let redacted = input;

  for (const { category, pattern } of REGEX_PATTERNS) {
    redacted = redacted.replace(pattern, (match, ...args) => {
      counters[category] = (counters[category] ?? 0) + 1;
      const placeholder = `[${category.toUpperCase()}_${counters[category]}]`;
      const startOffset =
        typeof args[args.length - 2] === 'number'
          ? (args[args.length - 2] as number)
          : 0;
      entities.push({
        category,
        original: match,
        placeholder,
        startOffset,
        endOffset: startOffset + match.length,
      });
      return placeholder;
    });
  }

  if (opts.runNer && process.env.AR_PII_REDACTION_ENABLED === 'true') {
    const nerResult = await invokeBedrock({
      model: 'haiku',
      systemPrompt:
        'You are a PII named-entity recognizer. Identify every person name and street address in the input. ' +
        'Return JSON: { "entities": [{ "category": "person_name"|"address", "text": "<exact match>" }] }. ' +
        'Do not modify the input. Do not include organization names or professional titles unless they are personal identifiers.',
      userPrompt: redacted,
      maxTokens: 2048,
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(nerResult.content) as {
        entities?: Array<{ category?: string; text?: string }>;
      };
      for (const e of parsed.entities ?? []) {
        if (
          !e.text ||
          (e.category !== 'person_name' && e.category !== 'address')
        ) {
          continue;
        }
        const category = e.category as PiiCategory;
        counters[category] = (counters[category] ?? 0) + 1;
        const placeholder = `[${category.toUpperCase()}_${counters[category]}]`;
        const idx = redacted.indexOf(e.text);
        if (idx >= 0) {
          entities.push({
            category,
            original: e.text,
            placeholder,
            startOffset: idx,
            endOffset: idx + e.text.length,
          });
          redacted =
            redacted.substring(0, idx) +
            placeholder +
            redacted.substring(idx + e.text.length);
        }
      }
    } catch {
      // NER failure is non-fatal; regex pass still redacted structured PII.
    }
  }

  const mapHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(entities))
    .digest('hex');

  return { redacted, entities, mapHash };
}

/**
 * Envelope-encrypts the redaction map for storage (AES-256-GCM).
 * Full Vault wiring lands Week 4; for now use env-scoped key.
 */
export function encryptRedactionMap(
  entities: PiiEntity[],
  keyBase64: string,
): { ciphertext: string; keyRef: string } {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('redaction_key_must_be_32_bytes_base64');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(entities), 'utf-8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, authTag, encrypted]).toString('base64'),
    keyRef: crypto.createHash('sha256').update(key).digest('hex').slice(0, 16),
  };
}
